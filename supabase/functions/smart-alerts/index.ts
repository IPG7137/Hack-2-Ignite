// Supabase Edge Function: smart-alerts
// Evaluates complaints telemetry server-side and returns authorized, deduplicated smart alerts

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    let userRole = "officer";
    let userDistrict = "pune";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (!userError && user) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("role, district_id")
          .eq("id", user.id)
          .single();
        if (profile) {
          userRole = profile.role;
          userDistrict = profile.district_id || "pune";
        }
      }
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const districtId = userRole === "state_admin" ? (body.districtId || null) : userDistrict;

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
    const now = Date.now();

    (reports || []).forEach((r: any) => {
      const isUrgent = r.priority === "urgent" || r.priority === "critical";
      const isTerminal = r.status === "verified" || r.status === "closed" || r.status === "resolved";

      if (isUrgent && !isTerminal) {
        alerts.push({
          id: `alert-${r.id}-critical`,
          fingerprint: `CRITICAL:${r.id}`,
          type: "CRITICAL_COMPLAINT",
          severity: "CRITICAL",
          title: `Critical Grievance: #${r.id} (${r.title})`,
          description: `Urgent hazard flagged in ${r.location || "municipal area"}.`,
          districtId: districtId || "pune",
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
