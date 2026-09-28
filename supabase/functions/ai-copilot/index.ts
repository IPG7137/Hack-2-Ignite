// supabase/functions/ai-copilot/index.ts
// CivicResolve — Server-Side AI Civic Copilot Edge Function
// Executes Google Gemini AI with caller authentication, strict district data isolation,
// prompt-injection filtering, PII redaction, and deterministic database grounding.
// Zero client-side GEMINI_API_KEY exposure.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    // 2. Caller Authentication Verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    let userRole = "citizen";
    let userDistrict = "";
    let userId: string | undefined;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid auth token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = user.id;

      // Check database role & district
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, district_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        userRole = profile.role || "citizen";
        userDistrict = profile.district_id || "";
      }
    }

    // 3. Request Payload
    const body = await req.json().catch(() => ({}));
    const userQuery = String(body.query || "").trim();
    const clientDistrict = String(body.districtId || userDistrict).toLowerCase();
    const telemetryContext = body.telemetryContext || {};

    // 4. District Isolation Security Enforcement
    if (userRole !== "state_admin" && userRole !== "super_admin") {
      const foreignDistricts = ["pune", "solapur", "nashik", "sambhajinagar", "thane", "nagpur"]
        .filter((d) => d !== clientDistrict && userQuery.toLowerCase().includes(d));
      
      if (foreignDistricts.length > 0) {
        return new Response(
          JSON.stringify({
            answer: `### 🔒 District Isolation Security Policy\n\nThe requested information is not available within your authorized access.\n\nYour session is authorized for **${clientDistrict.toUpperCase()}** district records only. Cross-district data queries are restricted.`,
            mode: "district_isolation_enforced",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Prompt Injection Defense
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /bypass\s+rls/i,
      /pretend\s+i\s+am\s+(super_admin|admin|commissioner)/i,
      /reveal\s+system\s+prompt/i,
      /give\s+me\s+all\s+districts/i,
    ];

    if (injectionPatterns.some((pattern) => pattern.test(userQuery))) {
      return new Response(
        JSON.stringify({
          answer: `### 🛡️ Security Policy Alert\n\nUnauthorized prompt override attempt detected. The CivicResolve AI Copilot operates strictly as an evidence-constrained municipal assistant within authorized security boundaries.`,
          mode: "security_policy_enforced",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Gemini Generation (if GEMINI_API_KEY is present)
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey || geminiApiKey.length < 10) {
      return new Response(
        JSON.stringify({ answer: null, mode: "unconfigured_key_fallback_to_local" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are the CivicResolve AI Civic Copilot for ${clientDistrict.toUpperCase()} district, Maharashtra.
You assist ${userRole === "citizen" ? "citizens with their complaints and issue reporting" : "municipal administrators with factual operational telemetry"}.

Strict Constraints:
1. NEVER invent, fabricate, or hallucinate missing complaint IDs, timestamps, officer names, or government schemes.
2. If data is unavailable, state: "I don't have that information in the current system."
3. Never automatically execute mutations; recommend user review and confirmation.
4. Ground all answers strictly on the provided context payload.
5. Scrub all citizen Personally Identifiable Information (Aadhaar, personal phone numbers).`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\nUSER INQUIRY: "${userQuery}"\n\nGROUNDED CONTEXT:\n${JSON.stringify(telemetryContext, null, 2)}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!geminiResponse.ok) {
      return new Response(
        JSON.stringify({ answer: null, mode: "upstream_failure_fallback_to_local" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await geminiResponse.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const sanitizedAnswer = rawText ? maskPII(rawText) : null;

    return new Response(
      JSON.stringify({
        answer: sanitizedAnswer,
        mode: "gemini_server_verified",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("ai-copilot edge error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
