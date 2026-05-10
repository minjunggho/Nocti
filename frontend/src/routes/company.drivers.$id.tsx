import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyCompany } from "@/lib/company.functions";
import { type Company, type Driver, type HomeTimePolicy } from "@/data/mock";
import {
  adaptApiDriverToDriver,
  getDriver,
  getDriverMatches,
  deleteJob,
  updateJob,
  type ApiJob,
  type ApiMatchResponse,
} from "@/lib/api";
import { Eyebrow, DisplayHeading, NCard, MatchBadge, PillButton, Chip } from "@/components/nocti/primitives";
import { MatchBreakdown } from "@/components/nocti/MatchBreakdown";
import { computeMatch } from "@/lib/match";
import { ArrowLeft, MapPin, Briefcase, Loader2, Phone, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { OutreachDialog } from "@/components/nocti/OutreachDialog";
import { EntityFormDialog, type FieldDef } from "@/components/nocti/EntityFormDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/company/drivers/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Driver ${params.id} — Nocti` },
      { name: "description", content: "Review a driver's profile and see why they match your carrier." },
    ],
  }),
  component: DriverDetail,
});

const EXPERIENCE_RANGE: Record<string, [number, number]> = {
  entry: [0, 1],
  "1-3": [1, 3],
  "3-5": [3, 5],
  "5+": [5, 40],
};

function dbToCompany(row: Record<string, unknown>): Company {
  const exp = (row.experience_level as string | null) ?? "1-3";
  return {
    id: (row.id as string) ?? "company",
    name: (row.dba_name as string) || (row.legal_name as string) || "Your carrier",
    logo: (row.logo_url as string) || "",
    headline: (row.about as string) || "",
    hq: (row.hq_address as string) || "",
    fleet: (row.power_units as number) ?? 0,
    dot: row.dot_number ? `DOT ${row.dot_number}` : "",
    mc: row.mc_number ? `MC ${row.mc_number}` : "",
    payRange:
      row.pay_min != null && row.pay_max != null
        ? `$${(row.pay_min as number).toFixed(2)} – $${(row.pay_max as number).toFixed(2)} / mi`
        : "",
    payMin: (row.pay_min as number) ?? 0,
    payMax: (row.pay_max as number) ?? 0,
    homeTime:
      row.home_time_policy === "daily"
        ? "Home daily"
        : row.home_time_policy === "weekly"
          ? "Home weekly"
          : row.home_time_policy === "biweekly"
            ? "Home every 2–3 weeks"
            : "OTR",
    homeTimePolicy: ((row.home_time_policy as HomeTimePolicy) ?? "weekly"),
    benefits: (row.benefits as string[]) ?? [],
    lanes: (row.preferred_lanes as string[]) ?? [],
    equipment: (row.equipment_types as string[]) ?? [],
    requiredEndorsements: row.hazmat_required ? ["Hazmat"] : [],
    experienceRange: EXPERIENCE_RANGE[exp] ?? [1, 3],
    terminals: row.hq_address ? [row.hq_address as string] : [],
    fmcsa: {
      safety: (row.safety_rating as string) || "—",
      authority: (row.authority_status as string) || "—",
      inspections24mo: (row.inspections_24mo as number) ?? 0,
      oosRate: row.oos_rate_vehicle != null ? `${row.oos_rate_vehicle}%` : "—",
    },
    about: (row.about as string) || "",
    distanceMi: 0,
    lat: 0, lng: 0,
  };
}

function DriverDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const getMineFn = useServerFn(getMyCompany);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [matches, setMatches] = useState<ApiMatchResponse | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ApiJob | null>(null);
  const [jobBusy, setJobBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        nav({ to: "/company/auth" });
        return;
      }
      try {
        const [row, apiDriver] = await Promise.all([
          getMineFn().catch(() => null),
          getDriver(id).catch((err: unknown) => {
            if (active) setDriverError(err instanceof Error ? err.message : "Driver not found");
            return null;
          }),
        ]);
        if (!active) return;
        setCompany(row ? dbToCompany(row as Record<string, unknown>) : null);
        if (apiDriver) setDriver(adaptApiDriverToDriver(apiDriver));
      } finally {
        if (active) setLoading(false);
      }

      // Match-jobs is a separate, slower call — render the profile first.
      try {
        const m = await getDriverMatches(id);
        if (active) setMatches(m);
      } catch (err) {
        if (active) setMatchesError(err instanceof Error ? err.message : "Couldn't load matches");
      } finally {
        if (active) setMatchesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [nav, getMineFn, id]);

  const reloadMatches = async () => {
    try {
      const m = await getDriverMatches(id);
      setMatches(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reload matches");
    }
  };

  const onDeleteJob = async (jobId: number) => {
    if (!confirm("Delete this job?")) return;
    setJobBusy(true);
    try { await deleteJob(jobId); toast.success("Job deleted"); await reloadMatches(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setJobBusy(false); }
  };

  const matchScore = useMemo(
    () => (company && driver ? computeMatch(driver, company).match_score : 0),
    [driver, company],
  );

  if (loading || !driver) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        {driverError ? (
          <div className="text-sm text-destructive">{driverError}</div>
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <Link to="/company/drivers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to drivers
          </Link>
          <span className="text-sm font-serif italic">Nocti</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Eyebrow>Driver profile</Eyebrow>
        <div className="mt-3 flex items-start gap-5">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-serif italic text-foreground">
            {driver.firstName[0]}
            {driver.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <DisplayHeading as="h2">
              {driver.firstName} <em className="italic">{driver.lastName}</em>
            </DisplayHeading>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span><Briefcase className="inline h-4 w-4 mr-1.5" />{driver.yearsExp} yrs experience</span>
              <span><MapPin className="inline h-4 w-4 mr-1.5" />{driver.homeBase}</span>
              <span><Phone className="inline h-4 w-4 mr-1.5" />{driver.phone}</span>
            </div>
            {company && (
              <div className="mt-4"><MatchBadge value={matchScore} /></div>
            )}
          </div>
        </div>

        <section className="mt-10">
          <Eyebrow>About</Eyebrow>
          <p className="mt-3 text-body">{driver.about}</p>
        </section>

        <section className="mt-10">
          <Eyebrow>Endorsements</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {driver.endorsements.map((e) => <Chip key={e}>{e}</Chip>)}
          </div>
        </section>

        <section className="mt-10">
          <Eyebrow>Experience</Eyebrow>
          <NCard className="mt-3 divide-y divide-border">
            {driver.experience.map((x, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-foreground">{x.company}</span>
                  <span className="text-xs text-muted-foreground">{x.tenure}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{x.lanes} · {x.equipment}</p>
              </div>
            ))}
          </NCard>
        </section>

        <section className="mt-10">
          <Eyebrow>What they want</Eyebrow>
          <NCard className="mt-3 divide-y divide-border">
            <Row label="Pay" value={`$${driver.desiredPayMin.toFixed(2)} – $${driver.desiredPayMax.toFixed(2)} / mi`} />
            <Row label="Home time" value={driver.preferences.homeTime} />
            <Row label="Equipment" value={driver.preferences.equipment.join(", ")} />
            <div className="px-4 py-4">
              <p className="text-sm text-muted-foreground mb-2">Preferred lanes</p>
              <div className="flex flex-wrap gap-1.5">
                {driver.preferences.preferredLanes.map((l) => <Chip key={l}>{l}</Chip>)}
              </div>
            </div>
            {driver.preferences.avoidLanes.length > 0 && (
              <div className="px-4 py-4">
                <p className="text-sm text-muted-foreground mb-2">Won't run</p>
                <div className="flex flex-wrap gap-1.5">
                  {driver.preferences.avoidLanes.map((l) => <Chip key={l}>{l}</Chip>)}
                </div>
              </div>
            )}
            <div className="px-4 py-4">
              <p className="text-sm text-muted-foreground mb-2">Benefits wanted</p>
              <div className="flex flex-wrap gap-1.5">
                {driver.benefitsWanted.map((b) => <Chip key={b}>{b}</Chip>)}
              </div>
            </div>
          </NCard>
        </section>

        <section className="mt-12">
          {company ? (
            <MatchBreakdown driver={driver} company={company} />
          ) : (
            <NCard className="p-6 text-sm text-muted-foreground">
              Finish your carrier profile to see why this driver matches you.{" "}
              <Link to="/company" className="underline text-foreground">Complete onboarding →</Link>
            </NCard>
          )}
        </section>

        <section className="mt-12">
          <Eyebrow>Job matches</Eyebrow>
          <h3 className="mt-2 font-serif text-2xl">Ranked compatibility from the backend.</h3>
          {matches?.benchmark_weekly_used != null && (
            <p className="mt-2 text-sm text-muted-foreground">
              Compared against a weekly wage benchmark of ${matches.benchmark_weekly_used.toFixed(0)}.
            </p>
          )}

          {matchesLoading && (
            <NCard className="mt-4 p-6 text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Computing matches…
            </NCard>
          )}

          {matchesError && !matchesLoading && (
            <NCard className="mt-4 p-6 text-sm text-destructive border-destructive/40">
              {matchesError}
            </NCard>
          )}

          {!matchesLoading && !matchesError && matches && matches.matches.length === 0 && (
            <NCard className="mt-4 p-6 text-sm text-muted-foreground">
              No job matches yet. Scrape some jobs from the driver dashboard.
            </NCard>
          )}

          {!matchesLoading && matches && matches.matches.length > 0 && (
            <div className="mt-4 space-y-3">
              {matches.matches.map((m) => (
                <NCard key={m.job_id} className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-14 w-14 rounded-full flex flex-col items-center justify-center text-background flex-shrink-0"
                      style={{
                        backgroundColor:
                          m.compatibility_score >= 80
                            ? "var(--success)"
                            : m.compatibility_score >= 50
                              ? "#eab308"
                              : "var(--muted-foreground)",
                      }}
                    >
                      <span className="text-base font-semibold leading-none">{m.compatibility_score}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-90 mt-0.5">match</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <h4 className="font-serif text-lg text-foreground truncate">
                          {m.company_name ?? "Unnamed carrier"}
                        </h4>
                        {m.job_title && <span className="text-sm text-muted-foreground truncate">{m.job_title}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {m.location && <span><MapPin className="inline h-4 w-4 mr-1.5" />{m.location}</span>}
                        {m.estimated_weekly_pay != null && <span>${m.estimated_weekly_pay.toFixed(0)} / wk</span>}
                        {m.route_type && <span>{m.route_type}</span>}
                        {m.home_time && m.home_time !== "unknown" && <span>{m.home_time}</span>}
                        {m.equipment_type && <span>{m.equipment_type}</span>}
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-body">
                        {m.reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span
                              className="mt-0.5 inline-block min-w-[2.5rem] text-right text-xs font-mono"
                              style={{ color: r.points >= 0 ? "var(--success)" : "var(--destructive)" }}
                            >
                              {r.points >= 0 ? "+" : ""}{r.points}
                            </span>
                            <span>{r.reason}</span>
                          </li>
                        ))}
                      </ul>
                      {m.source_url && (
                        <a
                          href={m.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          View original posting <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        <button type="button" disabled={jobBusy}
                          onClick={() => setEditingJob({
                            id: m.job_id,
                            company_name: m.company_name,
                            job_title: m.job_title,
                            location: m.location,
                            state: null,
                            source: null,
                            source_url: m.source_url,
                            salary_text: null,
                            job_description: null,
                            route_type: m.route_type,
                            equipment_type: m.equipment_type,
                            home_time: m.home_time,
                            estimated_weekly_pay: m.estimated_weekly_pay,
                          })}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                          <Pencil className="h-3.5 w-3.5" />Edit
                        </button>
                        <button type="button" disabled={jobBusy}
                          onClick={() => void onDeleteJob(m.job_id)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </NCard>
              ))}
            </div>
          )}
        </section>

        <div className="mt-10 flex gap-2">
          <PillButton variant="secondary" className="flex-1" onClick={() => setOutreachOpen(true)}>
            Draft outreach
          </PillButton>
          <PillButton className="flex-1" onClick={() => setOutreachOpen(true)}>
            Invite to apply
          </PillButton>
        </div>
      </div>
      <OutreachDialog open={outreachOpen} onOpenChange={setOutreachOpen} driver={driver} company={company} />
      {editingJob && (
        <EntityFormDialog
          open={!!editingJob}
          onOpenChange={(v) => { if (!v) setEditingJob(null); }}
          title={`Edit job — ${editingJob.job_title ?? editingJob.id}`}
          fields={JOB_FIELDS}
          initial={editingJob as unknown as Record<string, unknown>}
          onSubmit={async (vals) => {
            await updateJob(editingJob.id, vals as Partial<ApiJob>);
            toast.success("Job updated");
            setEditingJob(null);
            await reloadMatches();
          }}
        />
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}

const JOB_FIELDS: FieldDef[] = [
  { key: "company_name", label: "Company name" },
  { key: "job_title", label: "Job title" },
  { key: "location", label: "Location" },
  { key: "state", label: "State" },
  { key: "source_url", label: "Source URL" },
  { key: "salary_text", label: "Salary text" },
  { key: "employment_type", label: "Employment type" },
  { key: "rating", label: "Rating", type: "number" },
  { key: "route_type", label: "Route type" },
  { key: "equipment_type", label: "Equipment type" },
  { key: "home_time", label: "Home time" },
  { key: "pay_model", label: "Pay model" },
  { key: "estimated_weekly_pay", label: "Estimated weekly pay", type: "number" },
  { key: "experience_required", label: "Experience required" },
  { key: "benefits_mentioned", label: "Benefits mentioned" },
  { key: "detention_pay_mentioned", label: "Detention pay mentioned", type: "checkbox" },
  { key: "job_description", label: "Job description", type: "textarea" },
];