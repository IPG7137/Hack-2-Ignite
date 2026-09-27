// supabase/functions/ai-triage/index.ts
// CivicResolve — Server-Side AI Triage Edge Function
// Executes Google Gemini AI analysis server-side with strict caller authentication,
// input validation, PII scrubbing, and output schema enforcement.
// Zero client-side GEMINI_API_KEY exposure.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriagePayload {
  description?: string;
  image_base64?: string;
  mime_type?: string;
}

interface TriageResult {
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  suggested_department: string;
  reasoning: string;
  is_successful: boolean;
}

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

function normalizeSeverity(raw: string): "Low" | "Medium" | "High" | "Critical" {
  const lower = (raw || "").trim().toLowerCase();
  if (lower.includes("critical")) return "Critical";
  if (lower.includes("high")) return "High";
  if (lower.includes("medium")) return "Medium";
  if (lower.includes("low")) return "Low";
  return "Medium";
}

function inferDepartment(category: string): string {
  switch ((category || "").toLowerCase()) {
    case "roads":
    case "potholes_roads":
      return "Roads & Infrastructure (PWD)";
    case "waste":
    case "waste_management":
      return "Solid Waste Management";
    case "water":
    case "drainage":
    case "water_sewage":
      return "Water Supply & Sewerage Board";
    case "streetlights":
    case "electricity_streetlights":
      return "Electrical & Lighting Dept";
    case "public safety":
    case "public_safety":
      return "Public Safety & Emergency Services";
    default:
      return "Municipal General Administration";
  }
}

function fallbackTriage(description?: string): TriageResult {
  const desc = (description || "").toLowerCase();
  let category = "Other";
  let severity: "Low" | "Medium" | "High" | "Critical" = "Medium";

  if (desc.includes("pothole") || desc.includes("road") || desc.includes("tar")) {
    category = "Roads";
    severity = desc.includes("deep") || desc.includes("accident") ? "High" : "Medium";
  } else if (desc.includes("garbage") || desc.includes("waste") || desc.includes("trash")) {
    category = "Waste";
    severity = desc.includes("overflow") || desc.includes("dump") ? "High" : "Medium";
  } else if (desc.includes("water") || desc.includes("pipe") || desc.includes("leak") || desc.includes("sewage")) {
    category = "Water";
    severity = desc.includes("burst") || desc.includes("flood") ? "Critical" : "Medium";
  } else if (desc.includes("light") || desc.includes("dark") || desc.includes("lamp")) {
    category = "Streetlights";
    severity = "Low";
  } else if (desc.includes("fire") || desc.includes("collapse") || desc.includes("shock") || desc.includes("hazard")) {
    category = "Public Safety";
    severity = "Critical";
  }

  return {
    category,
    severity,
    suggested_department: inferDepartment(category),
    reasoning: "Deterministic rule-based triage assessment based on submission attributes.",
    is_successful: true,
  };
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
    
    // Validate user session token with Supabase Auth
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
    }

    // 3. Request Validation & Input Sanitization
    const body: TriagePayload = await req.json().catch(() => ({}));
    const sanitizedDescription = maskPII(body.description || "");
    const imageBase64 = body.image_base64;
    const mimeType = body.mime_type || "image/jpeg";

    // 4. Server-Side Gemini API Key Check
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey || geminiApiKey.length < 10) {
      // Safe deterministic fallback when key is not configured on server
      const fallback = fallbackTriage(sanitizedDescription);
      return new Response(
        JSON.stringify({ success: true, data: fallback, mode: "deterministic_fallback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Construct Structured AI Prompt
    const structuredPrompt = `
You are an expert Municipal Infrastructure and Civic Safety Triage AI for CivicResolve.
Analyze the provided image and description to categorize and prioritize the civic issue accurately.

Citizen Description (PII Sanitized):
${sanitizedDescription || "No additional description provided."}

Instructions:
1. Examine visual evidence for hazard level, structural risk, public health threat, or traffic disruption.
2. Accurately assign:
   - "category": One of ["Roads", "Waste", "Water", "Drainage", "Streetlights", "Public Safety", "Other"]
   - "severity": One of ["Critical", "High", "Medium", "Low"]
   - "suggested_department": Responsible municipal department.
   - "reasoning": 1-2 sentence concise explanation of findings.

Return ONLY a valid JSON object matching this schema:
{
  "category": "Roads | Waste | Water | Drainage | Streetlights | Public Safety | Other",
  "severity": "Low | Medium | High | Critical",
  "suggested_department": "string",
  "reasoning": "string"
}
`;

    const parts: any[] = [{ text: structuredPrompt }];
    if (imageBase64 && imageBase64.length > 50) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      });
    }

    // 6. Secure Server-to-Server Gemini Call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiResponse.ok) {
      console.warn("Gemini upstream returned non-200 status, using fallback triage.");
      const fallback = fallbackTriage(sanitizedDescription);
      return new Response(
        JSON.stringify({ success: true, data: fallback, mode: "deterministic_fallback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      const fallback = fallbackTriage(sanitizedDescription);
      return new Response(
        JSON.stringify({ success: true, data: fallback, mode: "deterministic_fallback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Validate and Enforce Output Schema
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
    if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
    if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson);
    const validatedResult: TriageResult = {
      category: parsed.category || "Other",
      severity: normalizeSeverity(parsed.severity),
      suggested_department: parsed.suggested_department || inferDepartment(parsed.category),
      reasoning: maskPII(parsed.reasoning || "Automated civic triage completed."),
      is_successful: true,
    };

    return new Response(
      JSON.stringify({ success: true, data: validatedResult, mode: "gemini_server_verified" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("ai-triage error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
