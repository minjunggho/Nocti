import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { driver, company, tone = "warm", channel = "email" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!driver || !company) {
      return new Response(JSON.stringify({ error: "driver and company are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a recruiter at a trucking carrier writing a short, ${tone}, personalized first-touch ${channel} to a CDL driver. Reference 1-2 SPECIFIC matches between the driver's profile and the carrier's ICP (lanes, equipment, home time, pay, endorsements, experience). Be honest, no hype. ${channel === "sms" ? "Keep under 320 characters. No subject line. Sign with recruiter first name only." : "Include a short subject line. 90-140 words. Plain text. Sign with recruiter first name + carrier name."} Never invent facts not present in the inputs.`;

    const user = `CARRIER (us):\n${JSON.stringify({
      name: company.name, hq: company.hq, fleet: company.fleet,
      payRange: company.payRange, homeTime: company.homeTime,
      lanes: company.lanes, equipment: company.equipment,
      benefits: company.benefits, requiredEndorsements: company.requiredEndorsements,
      about: company.about,
    }, null, 2)}\n\nDRIVER (them):\n${JSON.stringify({
      name: `${driver.firstName} ${driver.lastName}`,
      yearsExp: driver.yearsExp, homeBase: driver.homeBase, status: driver.status,
      endorsements: driver.endorsements,
      desiredPay: `$${driver.desiredPayMin}-$${driver.desiredPayMax}/mi`,
      preferences: driver.preferences, benefitsWanted: driver.benefitsWanted,
      about: driver.about,
    }, null, 2)}\n\nWrite the ${channel} now.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Failed to draft outreach" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const draft = json.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-outreach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});