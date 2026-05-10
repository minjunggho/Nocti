// FastAPI backend client
// All dashboard data + actions flow through this module.

import type { Company, Driver, HomeTimePolicy } from "@/data/mock";

export const API_BASE_URL = "https://entree-buckshot-urgency.ngrok-free.dev";

// ngrok free endpoints serve a browser-warning HTML by default; this header
// bypasses it so we always get JSON.
const DEFAULT_HEADERS: HeadersInit = {
  "ngrok-skip-browser-warning": "1",
  Accept: "application/json",
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `API ${init.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─────────── Types ───────────

export type ApiDriver = {
  id: number;
  name: string;
  experience_years: number | null;
  vehicle_type: string | null;
  home_city: string | null;
  home_state: string | null;
  preferred_lane_type: string | null;
  desired_home_time: string | null;
  pay_priority: string | null;
  communication_preference: string | null;
  burnout_concerns: string | null;
  created_at: string;
};

export type ApiJob = {
  id: number;
  company_name: string | null;
  job_title: string | null;
  location: string | null;
  state: string | null;
  source: string | null;
  source_url: string | null;
  salary_text: string | null;
  job_description: string | null;
  employment_type?: string | null;
  rating?: number | null;
  route_type?: string | null;
  equipment_type?: string | null;
  home_time?: string | null;
  pay_model?: string | null;
  estimated_weekly_pay?: number | null;
  detention_pay_mentioned?: boolean | null;
  experience_required?: string | null;
  benefits_mentioned?: string | null;
};

export type ApiBenchmark = {
  id: number;
  state: string;
  occupation: string;
  annual_median_wage: number;
  weekly_median_wage: number;
  source: string;
  year: number;
};

export type MatchReason = { points: number; reason: string };

export type ApiMatch = {
  job_id: number;
  company_name: string | null;
  job_title: string | null;
  location: string | null;
  compatibility_score: number;
  estimated_weekly_pay: number | null;
  home_time: string | null;
  route_type: string | null;
  equipment_type: string | null;
  source_url: string | null;
  reasons: MatchReason[];
};

export type ApiMatchResponse = {
  driver: ApiDriver;
  benchmark_weekly_used: number | null;
  matches: ApiMatch[];
};

export type ScrapeRequest = {
  position?: string;
  location?: string;
  max_items?: number;
};

// ─────────── Drivers ───────────

export const listDrivers = () =>
  request<{ count: number; drivers: ApiDriver[] }>("/drivers");

export const getDriver = (id: number | string) =>
  request<ApiDriver>(`/drivers/${id}`);

export type VerificationSession = {
  driver?: ApiDriver | null;
  email?: string | null;
  name?: string | null;
  success?: boolean;
};

export const getDriverByEmail = (email: string) =>
  request<ApiDriver | VerificationSession>(
    `/drivers/by-email?email=${encodeURIComponent(email)}`,
  );

export const getVerificationSession = (email: string) =>
  request<VerificationSession>(
    `/drivers/verification-session?email=${encodeURIComponent(email)}`,
  );

export type VerifyEmailResponse = {
  success: boolean;
  driver: ApiDriver & { email?: string; email_confirmed?: boolean };
};

export const verifyDriverEmail = (email: string, code: string) =>
  request<VerifyEmailResponse>(`/drivers/verify-email`, {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });

export const sendVerificationEmail = (email: string) =>
  request<{ success: boolean }>(`/drivers/send-verification-email`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const updateDriver = (id: number | string, body: Partial<ApiDriver>) =>
  request<ApiDriver>(`/drivers/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteDriver = (id: number | string) =>
  request<unknown>(`/drivers/${id}`, { method: "DELETE" });

export const deleteAllDrivers = () =>
  request<unknown>("/drivers", { method: "DELETE" });

export const getDriverMatches = (id: number | string) =>
  request<ApiMatchResponse>(`/drivers/${id}/match-jobs`);

// ─────────── Jobs ───────────

export const listJobs = () =>
  request<{ count: number; jobs: ApiJob[] }>("/jobs");

export const getJob = (id: number | string) =>
  request<ApiJob>(`/jobs/${id}`);

export const createJob = (job: Partial<ApiJob>) =>
  request<ApiJob>("/jobs", { method: "POST", body: JSON.stringify(job) });

export const updateJob = (id: number | string, body: Partial<ApiJob>) =>
  request<ApiJob>(`/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteJob = (id: number | string) =>
  request<unknown>(`/jobs/${id}`, { method: "DELETE" });

export const deleteAllJobs = () =>
  request<unknown>("/jobs", { method: "DELETE" });

export const scrapeJobs = (
  body: ScrapeRequest = { position: "truck driver", location: "California", max_items: 5 },
) =>
  request<unknown>("/jobs/scrape", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─────────── Benchmarks ───────────

export const listBenchmarks = () =>
  request<{ count: number; benchmarks: ApiBenchmark[] }>("/benchmarks");

export const addBenchmarks = (entries: Partial<ApiBenchmark>[]) =>
  request<unknown>("/benchmarks", {
    method: "POST",
    body: JSON.stringify(entries),
  });

export const updateBenchmark = (id: number | string, body: Partial<ApiBenchmark>) =>
  request<ApiBenchmark>(`/benchmarks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteBenchmark = (id: number | string) =>
  request<unknown>(`/benchmarks/${id}`, { method: "DELETE" });

export const deleteAllBenchmarks = () =>
  request<unknown>("/benchmarks", { method: "DELETE" });

// ─────────── Adapters: API → existing UI shapes ───────────

function mapHomeTime(raw: string | null | undefined): HomeTimePolicy {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("daily")) return "daily";
  if (s.includes("bi") || s.includes("2 week") || s.includes("two week")) return "biweekly";
  if (s.includes("otr") || s.includes("over the road")) return "OTR";
  return "weekly";
}

function homeTimeLabel(p: HomeTimePolicy): string {
  return p === "daily" ? "Home daily"
    : p === "weekly" ? "Home weekly"
    : p === "biweekly" ? "Home every 2–3 weeks"
    : "OTR";
}

export function adaptApiDriverToDriver(d: ApiDriver): Driver {
  const [first, ...rest] = (d.name ?? "Driver").trim().split(/\s+/);
  const last = rest.join(" ") || "—";
  const home = [d.home_city, d.home_state].filter(Boolean).join(", ") || "—";
  const equip = (d.vehicle_type ?? "")
    .split(/[,/]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/\b\w/g, (c) => c.toUpperCase()));
  const desiredHomeTime = mapHomeTime(d.desired_home_time);
  const aboutParts = [d.communication_preference, d.burnout_concerns, d.pay_priority]
    .filter(Boolean)
    .join(" ");
  return {
    id: String(d.id),
    firstName: first || "Driver",
    lastName: last,
    phone: "",
    yearsExp: d.experience_years ?? 0,
    homeBase: home,
    status: "Looking",
    photo: "",
    about: aboutParts,
    endorsements: [],
    experience: [],
    preferences: {
      payPerMile: "",
      homeTime: homeTimeLabel(desiredHomeTime),
      preferredLanes: d.preferred_lane_type ? [d.preferred_lane_type] : [],
      avoidLanes: [],
      equipment: equip,
    },
    desiredHomeTime,
    desiredPayMin: 0.6,
    desiredPayMax: 0.8,
    benefitsWanted: [],
    documents: [],
  };
}

/**
 * Render a scraped job as a "Company"-shaped card so the existing carrier
 * feed UI (driver dashboard) can display it without redesign.
 */
export function adaptApiJobToCompany(j: ApiJob): Company {
  const headline = (j.job_description ?? "").replace(/\s+/g, " ").slice(0, 240);
  return {
    id: String(j.id),
    name: j.company_name ?? "Unnamed carrier",
    logo: "",
    headline: j.job_title || headline || "Open driving role",
    hq: j.location ?? "—",
    fleet: 0,
    dot: "",
    mc: "",
    payRange: j.salary_text ?? "",
    payMin: 0,
    payMax: 0,
    homeTime: "—",
    homeTimePolicy: "weekly",
    benefits: [],
    lanes: [],
    equipment: [],
    requiredEndorsements: [],
    experienceRange: [0, 40],
    terminals: j.location ? [j.location] : [],
    fmcsa: { safety: "—", authority: "—", inspections24mo: 0, oosRate: "—" },
    about: j.job_description ?? "",
    distanceMi: 0,
    lat: 0,
    lng: 0,
  };
}