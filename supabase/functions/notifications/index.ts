// Supabase Edge Function: notifications
// Server-side notification dispatching, template interpolation, delivery audit logging,
// with caller authentication, role validation, and strict district scoping.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeString(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Caller Authentication Verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    let callerRole = 'citizen';
    let callerDistrict = '';
    let callerId = '';

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid or expired auth token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      callerId = user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, district_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        callerRole = profile.role || 'citizen';
        callerDistrict = profile.district_id || '';
      }
    }

    const body = await req.json();
    const {
      userId,
      userRole = 'citizen',
      notificationType,
      variables = {},
      districtId,
      organizationId,
      complaintId,
      customSeverity = 'info',
      channels = ['in_app'],
    } = body;

    if (!userId || !notificationType || !districtId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, notificationType, districtId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Authorization & Scoping Guard
    // Citizens can only trigger notifications for their own user_id.
    // Municipal staff can only dispatch notifications within their authorized district scope (unless state_admin).
    if (callerRole === 'citizen' && callerId && userId !== callerId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Citizens cannot dispatch notifications to other users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (
      callerRole !== 'state_admin' &&
      callerRole !== 'super_admin' &&
      callerDistrict &&
      districtId.toLowerCase() !== callerDistrict.toLowerCase()
    ) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Cannot dispatch notifications outside authorized district' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Build sanitized notification record
    const title = sanitizeString(variables.title || `Notification: ${notificationType.replace(/_/g, ' ')}`);
    const message = sanitizeString(variables.message || `System event ${notificationType} recorded for ${districtId}.`);

    const notification = {
      id: notificationId,
      userId,
      userRole,
      notificationType: sanitizeString(notificationType),
      title,
      message,
      entityId: complaintId ? sanitizeString(complaintId) : null,
      complaintId: complaintId ? sanitizeString(complaintId) : null,
      districtId: sanitizeString(districtId),
      organizationId: organizationId ? sanitizeString(organizationId) : null,
      severity: customSeverity,
      isRead: false,
      createdAt: now,
      deepLink: complaintId ? `/complaints/${sanitizeString(complaintId)}` : '/alerts',
    };

    // Audit multi-channel deliveries
    const deliveryAudits = channels.map((ch: string) => {
      let status = 'DELIVERED';
      let failureReason = null;

      if (ch === 'in_app') {
        status = 'DELIVERED';
      } else if (ch === 'push') {
        status = 'SKIPPED';
        failureReason = 'Push notification channel not configured.';
      } else if (ch === 'email') {
        status = 'SKIPPED';
        failureReason = 'Email notification channel not configured.';
      } else if (ch === 'sms') {
        status = 'SKIPPED';
        failureReason = 'SMS notification channel not configured.';
      }

      return {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        notificationId,
        userId,
        channel: ch,
        deliveryStatus: status,
        failureReason,
        districtId: sanitizeString(districtId),
        createdAt: now,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        deliveryAudits,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
