import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ────────────────────────────────────────────────────────────────────
// FMCSA AUTOFILL
// ────────────────────────────────────────────────────────────────────

const FMCSA_BASE = "https://mobile.fmcsa.dot.gov/qc/services";

function pickNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickDate(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export const fetchFmcsa = createServerFn({ method: "POST" })
  .inputValidator((d: { dot?: string; mc?: string }) =>
    z
      .object({ dot: z.string().trim().optional(), mc: z.string().trim().optional() })
      .refine((v) => !!v.dot || !!v.mc, "Provide DOT or MC number")
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.FMCSA_WEB_KEY;
    if (!key) throw new Error("FMCSA_WEB_KEY is not configured");

    let dot = data.dot;
    if (!dot && data.mc) {
      const r = await fetch(`${FMCSA_BASE}/carriers/docket-number/${encodeURIComponent(data.mc)}?webKey=${key}`);
      const j = await r.json().catch(() => null);
      const arr = j?.content;
      const first = Array.isArray(arr) ? arr[0]?.carrier : arr?.carrier;
      dot = first?.dotNumber ? String(first.dotNumber) : undefined;
      if (!dot) throw new Error("No carrier found for that MC number");
    }

    const [carrierRes, oosRes, inspRes] = await Promise.all([
      fetch(`${FMCSA_BASE}/carriers/${dot}?webKey=${key}`),
      fetch(`${FMCSA_BASE}/carriers/${dot}/oos?webKey=${key}`).catch(() => null),
      fetch(`${FMCSA_BASE}/carriers/${dot}/inspection?webKey=${key}`).catch(() => null),
    ]);

    if (!carrierRes.ok) throw new Error(`FMCSA returned ${carrierRes.status}`);
    const carrierJson = await carrierRes.json();
    const c = carrierJson?.content?.carrier ?? carrierJson?.content ?? {};

    const oosJson = oosRes && oosRes.ok ? await oosRes.json().catch(() => null) : null;
    const oos = oosJson?.content ?? {};

    const inspJson = inspRes && inspRes.ok ? await inspRes.json().catch(() => null) : null;
    const inspContent = inspJson?.content ?? {};

    return {
      dot_number: dot ?? null,
      mc_number: data.mc ?? null,
      legal_name: c.legalName ?? null,
      dba_name: c.dbaName ?? null,
      authority_status: c.allowedToOperate === "Y" ? "Active" : c.allowedToOperate === "N" ? "Inactive" : null,
      operating_status: c.statusCode ?? c.carrierOperationDesc ?? null,
      power_units: pickNum(c.totalPowerUnits),
      drivers_count: pickNum(c.totalDrivers),
      safety_rating: c.safetyRating ?? null,
      safety_rating_date: pickDate(c.safetyRatingDate),
      oos_rate_vehicle: pickNum(oos.vehicleOosRate ?? c.vehicleOosRate),
      oos_rate_driver: pickNum(oos.driverOosRate ?? c.driverOosRate),
      hq_address: [c.phyStreet, c.phyCity, c.phyState, c.phyZipcode].filter(Boolean).join(", ") || null,
      mcs150_mileage: pickNum(c.mcs150Mileage),
      mcs150_date: pickDate(c.mcs150MileageYear ? `${c.mcs150MileageYear}-12-31` : c.mcs150Date),
      inspections_24mo: pickNum(inspContent.vehicleInspectionTotal ?? inspContent.totalInspections),
      oos_inspections_24mo: pickNum(inspContent.vehicleOosTotal ?? inspContent.driverOosTotal),
      raw: { carrier: c, oos, inspections: inspContent },
    };
  });

// ────────────────────────────────────────────────────────────────────
// WEBSITE SCRAPE + AI SUMMARIZE
// ────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findLogo(html: string, baseUrl: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return new URL(og[1], baseUrl).toString();
  const link = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
  if (link?.[1]) return new URL(link[1], baseUrl).toString();
  const img = html.match(/<img[^>]+(?:alt|src)=["'][^"']*logo[^"']*["'][^>]*>/i);
  if (img) {
    const src = img[0].match(/src=["']([^"']+)["']/i);
    if (src?.[1]) return new URL(src[1], baseUrl).toString();
  }
  return null;
}

function findContact(text: string): string {
  const out: string[] = [];
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (email) out.push(email[0]);
  const phone = text.match(/(?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phone) out.push(phone[0]);
  return out.join(" • ");
}

export const scrapeWebsite = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) =>
    z.object({ url: z.string().url() }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch(data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NoctiBot/1.0; +https://nocti.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Could not fetch site (${res.status})`);
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const text = stripHtml(html).slice(0, 12000);
    const logo = findLogo(html, data.url);
    const contact = findContact(text);

    // LLM summarize
    const llmRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You analyze trucking carrier websites. Be factual, concise, and flag uncertainty with 'Unclear:'. Never invent details.",
          },
          {
            role: "user",
            content: `Title: ${titleMatch?.[1] ?? ""}\nMeta: ${descMatch?.[1] ?? ""}\n\nWebsite text:\n${text}\n\nReturn structured details about this trucking company.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "summarize_carrier",
              description: "Summarize the trucking carrier",
              parameters: {
                type: "object",
                properties: {
                  about: { type: "string", description: "Plain-English description of the company in 2-4 sentences." },
                  services: { type: "string", description: "Equipment & freight types they haul (dry van, reefer, flatbed, etc.). Comma-separated phrases." },
                  culture: { type: "string", description: "Mission/values/employee-experience signals in 1-3 sentences." },
                },
                required: ["about", "services", "culture"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "summarize_carrier" } },
      }),
    });

    if (llmRes.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (llmRes.status === 402) throw new Error("AI credits exhausted. Add credits to keep using AI features.");
    if (!llmRes.ok) throw new Error(`AI summarize failed (${llmRes.status})`);

    const llmJson = await llmRes.json();
    const args = llmJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: { about?: string; services?: string; culture?: string } = {};
    try {
      parsed = args ? JSON.parse(args) : {};
    } catch {
      /* ignore */
    }

    return {
      website_url: data.url,
      about: parsed.about ?? "",
      services: parsed.services ?? "",
      culture: parsed.culture ?? "",
      contact_info: contact,
      logo_url: logo,
      title: titleMatch?.[1] ?? null,
    };
  });

// ────────────────────────────────────────────────────────────────────
// SAVE
// ────────────────────────────────────────────────────────────────────

const CompanyPayload = z.object({
  id: z.string().uuid().optional(),
  dot_number: z.string().nullable().optional(),
  mc_number: z.string().nullable().optional(),
  legal_name: z.string().nullable().optional(),
  dba_name: z.string().nullable().optional(),
  authority_status: z.string().nullable().optional(),
  operating_status: z.string().nullable().optional(),
  power_units: z.number().int().nullable().optional(),
  drivers_count: z.number().int().nullable().optional(),
  safety_rating: z.string().nullable().optional(),
  safety_rating_date: z.string().nullable().optional(),
  oos_rate_vehicle: z.number().nullable().optional(),
  oos_rate_driver: z.number().nullable().optional(),
  hq_address: z.string().nullable().optional(),
  mcs150_mileage: z.number().nullable().optional(),
  mcs150_date: z.string().nullable().optional(),
  inspections_24mo: z.number().int().nullable().optional(),
  oos_inspections_24mo: z.number().int().nullable().optional(),
  fmcsa_raw: z.any().optional(),
  website_url: z.string().nullable().optional(),
  about: z.string().nullable().optional(),
  services: z.string().nullable().optional(),
  culture: z.string().nullable().optional(),
  contact_info: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  scrape_raw: z.any().optional(),
  preferred_lanes: z.array(z.string()).optional(),
  equipment_types: z.array(z.string()).optional(),
  experience_level: z.string().nullable().optional(),
  hazmat_required: z.boolean().optional(),
  pay_min: z.number().nullable().optional(),
  pay_max: z.number().nullable().optional(),
  home_time_policy: z.string().nullable().optional(),
  benefits: z.array(z.string()).optional(),
  onboarding_step: z.number().int().optional(),
  onboarding_complete: z.boolean().optional(),
});

export const saveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyPayload.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, user_id: userId };

    if (data.id) {
      const { data: row, error } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }

    const { data: row, error } = await supabase
      .from("companies")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });