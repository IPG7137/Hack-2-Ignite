// Supabase Edge Function: smart-alerts
// Evaluates complaints telemetry server-side and returns authorized, deduplicated smart alerts
// with strict caller authentication, role authorization, and zero unauthenticated fallback.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Invalid or expired auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve user's actual database role & district
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role, district_id")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || "citizen";
    const userDistrict = profile?.district_id || "";

    // Citizens cannot access internal administrative smart alerts
    if (userRole === "citizen") {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Citizen accounts cannot access administrative smart alerts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    
    // State admins can filter by district; district/municipal officers are locked strictly to their authorized district
    let districtId: string;
    if (userRole === "state_admin" || userRole === "super_admin") {
      districtId = body.districtId || "";
    } else {
      if (!userDistrict) {
        return new Response(
          JSON.stringify({ success: false, error: "Configuration error: Officer profile has no assigned district" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      districtId = userDistrict;
    }

    // Fetch reports for authorized district
    let query = supabaseClient.from("reports").select("*");
    if (districtId) {
      query = query.ilike("location", `%${districtId}%`);
    }

    const { data: reports, error: reportsError } = await query.order("created_at", { ascending: false }).limit(200);

    if (reportsError) {
      throw reportsError;
    }

    // Process deterministic server-side alerts
    const alerts: any[] = [];

    (reports || []).forEach((r: any) => {
      const isUrgent = r.priority === "urgent" || r.priority === "critical" || r.priority === "high";
      const isTerminal = r.status === "verified" || r.status === "closed" || r.status === "resolved";

      if (isUrgent && !isTerminal) {
        alerts.push({
          id: `alert-${r.id}-critical`,
          fingerprint: `CRITICAL:${r.id}`,
          type: "CRITICAL_COMPLAINT",
          severity: "CRITICAL",
          title: `Critical Grievance: #${r.id} (${r.title || "Urgent Issue"})`,
          description: `Urgent hazard flagged in ${r.location || "municipal area"}.`,
          districtId: districtId || "maharashtra",
          complaintId: String(r.id),
          status: "ACTIVE",
          escalationLevel: 1,
          createdAt: r.created_at,
          recommendedAction: "Dispatch emergency response team immediately.",
        });
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        districtId,
        userRole,
        totalAlerts: alerts.length,
        alerts,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to process smart alerts" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
