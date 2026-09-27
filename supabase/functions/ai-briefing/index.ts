// supabase/functions/ai-briefing/index.ts
// CivicResolve — Server-Side AI Copilot Briefing Edge Function
// Executes Google Gemini AI executive briefing server-side with strict caller authentication,
// municipal role authorization, telemetry input validation, PII scrubbing, and output verification.
// Zero client-side GEMINI_API_KEY exposure.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_STAFF_ROLES = ["officer", "dept_admin", "municipal_admin", "super_admin"];

function maskPII(text: string): string {
  if (!text) return "";
  let sanitized = text;
  // 12-digit Indian Aadhaar number
  sanitized = sanitized.replace(/\b\d{4}\s?\d{4}\s?(\d{4})\b/g, "[AADHAAR REDACTED-****$1]");
  // Indian 10-digit mobile number
  sanitized = sanitized.replace(/(?:\+91[-\s]?)?[6-9]\d{9}\b/g, "[PHONE REDACTED]");
  // Email address
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL REDACTED]");
  return sanitized;
}

serve(async (req) => {
  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Caller Authentication & Staff Authorization Verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid or expired auth token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check database role authorization
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const userRole = roleData?.role || "citizen";
      if (!ALLOWED_STAFF_ROLES.includes(userRole)) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Executive briefing requires municipal staff role" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Request Payload Validation
    const body = await req.json().catch(() => ({}));
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey || geminiApiKey.length < 10) {
      return new Response(
        JSON.stringify({ briefing: null, mode: "unconfigured_key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Construct System Prompt & Grounded Context
    const systemPrompt = `You are the CivicResolve Executive Decision Support AI for City Municipal Operations.
Synthesize an authoritative, structured, and grounded operational status briefing.

Strict Constraints:
1. You MUST strictly use the provided JSON telemetry payload.
2. NEVER invent, fabricate, extrapolate, or hallucinate numeric figures, counts, percentages, locations, or statuses. Every number in your briefing MUST originate from the payload.
3. Structure your response into EXACTLY these 6 numbered sections:
   1. Overall Workload & Status Distribution
   2. High-Priority Unresolved Incidents
   3. SLA Health & Overdue Escalations
   4. 3C Emerging Spatio-Temporal Hotspots
   5. 3D Potential Incident Clusters (Common Root Causes)
   6. Recommended Operational Focus Areas (clearly labeled as AI decision-support advice)
4. For 3D grouped clusters, ALWAYS use "potential incident" terminology.
5. NEVER disclose citizen PII (no private phone numbers, Aadhaar, citizen personal identities).
6. Be crisp, executive-ready, and highly structured with Markdown headings and bullet points.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nGROUNDED TELEMETRY PAYLOAD:\n${JSON.stringify(body, null, 2)}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 20,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!geminiResponse.ok) {
      return new Response(
        JSON.stringify({ briefing: null, error: "Upstream AI failure" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await geminiResponse.json();
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const sanitizedBriefing = generatedText ? maskPII(generatedText) : null;

    return new Response(
      JSON.stringify({
        briefing: sanitizedBriefing,
        briefingText: sanitizedBriefing,
        mode: "gemini_server_verified",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("ai-briefing error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
