import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchFmcsa,
  scrapeWebsite,
  saveCompany,
  getMyCompany,
} from "@/lib/company.functions";
import { Eyebrow, DisplayHeading, PillButton, NCard, Chip } from "@/components/nocti/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Check, ArrowRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/company/")({
  head: () => ({
    meta: [
      { title: "Carrier onboarding — Nocti" },
      { name: "description", content: "Build your Nocti carrier profile in three steps: FMCSA autofill, website summary, and ICP." },
    ],
  }),
  component: CompanyOnboardingPage,
});

type CompanyState = {
  id?: string;
  dot_number?: string | null;
  mc_number?: string | null;
  legal_name?: string | null;
  dba_name?: string | null;
  authority_status?: string | null;
  operating_status?: string | null;
  power_units?: number | null;
  drivers_count?: number | null;
  safety_rating?: string | null;
  safety_rating_date?: string | null;
  oos_rate_vehicle?: number | null;
  oos_rate_driver?: number | null;
  hq_address?: string | null;
  mcs150_mileage?: number | null;
  mcs150_date?: string | null;
  inspections_24mo?: number | null;
  oos_inspections_24mo?: number | null;
  fmcsa_raw?: unknown;
  website_url?: string | null;
  about?: string | null;
  services?: string | null;
  culture?: string | null;
  contact_info?: string | null;
  logo_url?: string | null;
  preferred_lanes?: string[];
  equipment_types?: string[];
  experience_level?: string | null;
  hazmat_required?: boolean;
  pay_min?: number | null;
  pay_max?: number | null;
  home_time_policy?: string | null;
  benefits?: string[];
  onboarding_step?: number;
  onboarding_complete?: boolean;
};

const LANE_OPTIONS = ["SE regional", "Midwest", "TX ↔ SE", "Northeast", "West coast", "OTR 48 states", "TN ↔ TX", "TN ↔ FL", "FL produce"];
const EQUIPMENT_OPTIONS = ["Dry van", "Reefer", "Flatbed", "Step deck", "Tanker", "Hazmat", "Power only"];
const EXPERIENCE_OPTIONS = [
  { id: "entry", label: "Entry (0–1 yr)" },
  { id: "1-3", label: "1–3 years" },
  { id: "3-5", label: "3–5 years" },
  { id: "5+", label: "5+ years" },
];
const HOME_TIME_OPTIONS = [
  { id: "daily", label: "Home daily" },
  { id: "weekly", label: "Home weekly" },
  { id: "biweekly", label: "Home every 2–3 weeks" },
  { id: "OTR", label: "OTR" },
];
const BENEFIT_OPTIONS = ["Health insurance", "Dental", "Vision", "401k match", "Paid PTO", "Per diem", "Sign-on bonus", "Tarp pay", "Pet/rider policy"];

function CompanyOnboardingPage() {
  const nav = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState<CompanyState>({});
  const [loading, setLoading] = useState(false);

  const fmcsaFn = useServerFn(fetchFmcsa);
  const scrapeFn = useServerFn(scrapeWebsite);
  const saveFn = useServerFn(saveCompany);
  const getMineFn = useServerFn(getMyCompany);

  // auth gate + load existing draft
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        nav({ to: "/company/auth" });
        return;
      }
      try {
        const existing = await getMineFn();
        if (active && existing) {
          setCompany(existing as CompanyState);
          // If onboarding is complete, land on the review step so the user
          // can edit their profile. Otherwise resume where they left off.
          const targetStep = existing.onboarding_complete
            ? 4
            : Math.min(Math.max(existing.onboarding_step ?? 1, 1), 4);
          setStep(targetStep);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [nav, getMineFn]);

  const updateField = <K extends keyof CompanyState>(key: K, value: CompanyState[K]) =>
    setCompany((c) => ({ ...c, [key]: value }));

  const persist = async (extra: Partial<CompanyState> = {}) => {
    const payload = { ...company, ...extra };
    const saved = await saveFn({ data: payload as never });
    setCompany(saved as CompanyState);
    return saved;
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-sm font-serif italic">Nocti</Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              nav({ to: "/company/auth" });
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <Stepper step={step} onJump={company.onboarding_complete ? setStep : undefined} />

        {step === 1 && (
          <StepFmcsa
            company={company}
            updateField={updateField}
            loading={loading}
            onLookup={async (id) => {
              setLoading(true);
              try {
                const r = await fmcsaFn({ data: id });
                setCompany((c) => ({
                  ...c,
                  ...r,
                  fmcsa_raw: r.raw,
                }));
                toast.success(`Found ${r.legal_name ?? "carrier"}`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "FMCSA lookup failed");
              } finally {
                setLoading(false);
              }
            }}
            onContinue={async () => {
              setLoading(true);
              try {
                await persist({ onboarding_step: 2 });
                setStep(2);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Save failed");
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {step === 2 && (
          <StepWebsite
            company={company}
            updateField={updateField}
            loading={loading}
            onScrape={async (url) => {
              setLoading(true);
              try {
                const r = await scrapeFn({ data: { url } });
                setCompany((c) => ({
                  ...c,
                  website_url: r.website_url,
                  about: r.about,
                  services: r.services,
                  culture: r.culture,
                  contact_info: r.contact_info,
                  logo_url: r.logo_url,
                }));
                toast.success("Site analyzed — review and edit below.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Scrape failed");
              } finally {
                setLoading(false);
              }
            }}
            onBack={() => setStep(1)}
            onContinue={async () => {
              setLoading(true);
              try {
                await persist({ onboarding_step: 3 });
                setStep(3);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Save failed");
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {step === 3 && (
          <StepIcp
            company={company}
            updateField={updateField}
            loading={loading}
            onBack={() => setStep(2)}
            onFinish={async () => {
              setLoading(true);
              try {
                await persist({ onboarding_step: 4, onboarding_complete: true });
                setStep(4);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Save failed");
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {step === 4 && <StepDone company={company} />}
      </div>
    </main>
  );
}

// ────────────────────────────────────────────────
// Stepper
// ────────────────────────────────────────────────

function Stepper({ step, onJump }: { step: number; onJump?: (n: number) => void }) {
  const labels = ["FMCSA", "Website", "ICP", "Done"];
  return (
    <div className="mb-12 flex items-center gap-3">
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        const clickable = !!onJump;
        return (
          <div key={label} className="flex items-center gap-3">
            <button
              type="button"
              onClick={clickable ? () => onJump!(idx) : undefined}
              disabled={!clickable}
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
              } ${
                done
                  ? "bg-foreground text-background"
                  : active
                  ? "border border-foreground text-foreground"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : idx}
            </button>
            <button
              type="button"
              onClick={clickable ? () => onJump!(idx) : undefined}
              disabled={!clickable}
              className={`text-xs uppercase tracking-[0.18em] ${clickable ? "cursor-pointer hover:text-foreground" : "cursor-default"} ${active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </button>
            {idx < labels.length && <span className="h-px w-8 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────
// Step 1 — FMCSA
// ────────────────────────────────────────────────

function StepFmcsa({
  company,
  updateField,
  loading,
  onLookup,
  onContinue,
}: {
  company: CompanyState;
  updateField: <K extends keyof CompanyState>(key: K, value: CompanyState[K]) => void;
  loading: boolean;
  onLookup: (id: { dot?: string; mc?: string }) => void;
  onContinue: () => void;
}) {
  const [dot, setDot] = useState(company.dot_number ?? "");
  const [mc, setMc] = useState(company.mc_number ?? "");
  const hasData = !!company.legal_name;

  return (
    <section>
      <Eyebrow>Step 01 · Verify carrier</Eyebrow>
      <DisplayHeading className="mt-3">Pull your FMCSA record.</DisplayHeading>
      <p className="mt-3 text-muted-foreground max-w-xl">
        Enter your DOT or MC number. We'll fetch your authority, fleet, and safety data straight from FMCSA — you confirm or correct it.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
        <div>
          <Label htmlFor="dot">DOT number</Label>
          <Input id="dot" value={dot} onChange={(e) => setDot(e.target.value)} placeholder="e.g. 2148391" className="mt-1.5 h-11" />
        </div>
        <div>
          <Label htmlFor="mc">MC number</Label>
          <Input id="mc" value={mc} onChange={(e) => setMc(e.target.value)} placeholder="e.g. 762184" className="mt-1.5 h-11" />
        </div>
        <div className="flex items-end">
          <PillButton
            type="button"
            disabled={loading || (!dot && !mc)}
            onClick={() => onLookup({ dot: dot || undefined, mc: mc || undefined })}
            className="w-full sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
          </PillButton>
        </div>
      </div>

      {hasData && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldCard label="Legal name" value={company.legal_name ?? ""} onChange={(v) => updateField("legal_name", v)} />
          <FieldCard label="DBA" value={company.dba_name ?? ""} onChange={(v) => updateField("dba_name", v)} />
          <FieldCard label="Authority" value={company.authority_status ?? ""} onChange={(v) => updateField("authority_status", v)} />
          <FieldCard label="Operating status" value={company.operating_status ?? ""} onChange={(v) => updateField("operating_status", v)} />
          <FieldCard label="Power units" value={String(company.power_units ?? "")} onChange={(v) => updateField("power_units", v ? parseInt(v) : null)} />
          <FieldCard label="Drivers" value={String(company.drivers_count ?? "")} onChange={(v) => updateField("drivers_count", v ? parseInt(v) : null)} />
          <FieldCard label="Safety rating" value={company.safety_rating ?? ""} onChange={(v) => updateField("safety_rating", v)} />
          <FieldCard label="Safety rating date" value={company.safety_rating_date ?? ""} onChange={(v) => updateField("safety_rating_date", v)} />
          <FieldCard label="Vehicle OOS rate" value={String(company.oos_rate_vehicle ?? "")} onChange={(v) => updateField("oos_rate_vehicle", v ? parseFloat(v) : null)} />
          <FieldCard label="Driver OOS rate" value={String(company.oos_rate_driver ?? "")} onChange={(v) => updateField("oos_rate_driver", v ? parseFloat(v) : null)} />
          <FieldCard label="HQ address" value={company.hq_address ?? ""} onChange={(v) => updateField("hq_address", v)} className="md:col-span-2" />
          <FieldCard label="MCS-150 mileage" value={String(company.mcs150_mileage ?? "")} onChange={(v) => updateField("mcs150_mileage", v ? parseInt(v) : null)} />
          <FieldCard label="MCS-150 date" value={company.mcs150_date ?? ""} onChange={(v) => updateField("mcs150_date", v)} />
          <FieldCard label="Inspections (24 mo)" value={String(company.inspections_24mo ?? "")} onChange={(v) => updateField("inspections_24mo", v ? parseInt(v) : null)} />
          <FieldCard label="OOS inspections (24 mo)" value={String(company.oos_inspections_24mo ?? "")} onChange={(v) => updateField("oos_inspections_24mo", v ? parseInt(v) : null)} />
        </div>
      )}

      <div className="mt-10 flex justify-end">
        <PillButton type="button" onClick={onContinue} disabled={loading || !hasData}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </PillButton>
      </div>
    </section>
  );
}

function FieldCard({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <NCard className={`p-4 ${className ?? ""}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-transparent text-base text-foreground outline-none focus:ring-0"
      />
    </NCard>
  );
}

// ────────────────────────────────────────────────
// Step 2 — Website scrape
// ────────────────────────────────────────────────

function StepWebsite({
  company,
  updateField,
  loading,
  onScrape,
  onBack,
  onContinue,
}: {
  company: CompanyState;
  updateField: <K extends keyof CompanyState>(key: K, value: CompanyState[K]) => void;
  loading: boolean;
  onScrape: (url: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [url, setUrl] = useState(company.website_url ?? "");
  const hasContent = !!(company.about || company.services || company.culture);

  return (
    <section>
      <Eyebrow>Step 02 · Tell your story</Eyebrow>
      <DisplayHeading className="mt-3">We'll read your site for you.</DisplayHeading>
      <p className="mt-3 text-muted-foreground max-w-xl">
        Paste your company website. Our AI extracts your About, Services, and Culture — you review and edit.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-carrier.com" className="h-11" />
        <PillButton type="button" disabled={loading || !url} onClick={() => onScrape(url)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze site"}
        </PillButton>
      </div>

      {hasContent && (
        <div className="mt-10 space-y-5">
          {company.logo_url && (
            <div className="flex items-center gap-3">
              <img src={company.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded border border-border" />
              <span className="text-xs text-muted-foreground">Detected logo</span>
            </div>
          )}
          <FieldArea label="About" value={company.about ?? ""} onChange={(v) => updateField("about", v)} rows={4} />
          <FieldArea label="Services" value={company.services ?? ""} onChange={(v) => updateField("services", v)} rows={3} />
          <FieldArea label="Culture" value={company.culture ?? ""} onChange={(v) => updateField("culture", v)} rows={3} />
          <FieldArea label="Contact" value={company.contact_info ?? ""} onChange={(v) => updateField("contact_info", v)} rows={2} />
        </div>
      )}

      <div className="mt-10 flex justify-between">
        <PillButton type="button" variant="secondary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</PillButton>
        <PillButton type="button" onClick={onContinue} disabled={loading}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </PillButton>
      </div>
    </section>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1.5" />
    </div>
  );
}

// ────────────────────────────────────────────────
// Step 3 — ICP
// ────────────────────────────────────────────────

function StepIcp({
  company,
  updateField,
  loading,
  onBack,
  onFinish,
}: {
  company: CompanyState;
  updateField: <K extends keyof CompanyState>(key: K, value: CompanyState[K]) => void;
  loading: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const lanes = company.preferred_lanes ?? [];
  const eq = company.equipment_types ?? [];
  const benefits = company.benefits ?? [];

  const toggle = <K extends "preferred_lanes" | "equipment_types" | "benefits">(key: K, item: string) => {
    const arr = (company[key] as string[] | undefined) ?? [];
    updateField(key, (arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]) as never);
  };

  return (
    <section>
      <Eyebrow>Step 03 · Define your ideal driver</Eyebrow>
      <DisplayHeading className="mt-3">Who do you want to recruit?</DisplayHeading>
      <p className="mt-3 text-muted-foreground max-w-xl">
        We use this to match you with drivers whose lane preferences, experience, and pay expectations align.
      </p>

      <div className="mt-10 space-y-10">
        <Group title="Preferred lanes">
          <ChipGrid items={LANE_OPTIONS} selected={lanes} onToggle={(v) => toggle("preferred_lanes", v)} />
        </Group>

        <Group title="Equipment you run">
          <ChipGrid items={EQUIPMENT_OPTIONS} selected={eq} onToggle={(v) => toggle("equipment_types", v)} />
        </Group>

        <Group title="Experience level">
          <ChipGrid
            items={EXPERIENCE_OPTIONS.map((o) => o.label)}
            selected={EXPERIENCE_OPTIONS.filter((o) => o.id === company.experience_level).map((o) => o.label)}
            onToggle={(label) => {
              const opt = EXPERIENCE_OPTIONS.find((o) => o.label === label);
              if (opt) updateField("experience_level", opt.id);
            }}
            single
          />
        </Group>

        <Group title="Hazmat endorsement required?">
          <div className="flex gap-3">
            <Chip className={!company.hazmat_required ? "" : "opacity-50"}>
              <button type="button" onClick={() => updateField("hazmat_required", false)} className="px-1">No</button>
            </Chip>
            <Chip className={company.hazmat_required ? "" : "opacity-50"}>
              <button type="button" onClick={() => updateField("hazmat_required", true)} className="px-1">Yes</button>
            </Chip>
          </div>
        </Group>

        <Group title="Pay range ($/mile)">
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <Input
              type="number"
              step="0.01"
              placeholder="Min"
              value={company.pay_min ?? ""}
              onChange={(e) => updateField("pay_min", e.target.value ? parseFloat(e.target.value) : null)}
              className="h-11"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Max"
              value={company.pay_max ?? ""}
              onChange={(e) => updateField("pay_max", e.target.value ? parseFloat(e.target.value) : null)}
              className="h-11"
            />
          </div>
        </Group>

        <Group title="Home time policy">
          <ChipGrid
            items={HOME_TIME_OPTIONS.map((o) => o.label)}
            selected={HOME_TIME_OPTIONS.filter((o) => o.id === company.home_time_policy).map((o) => o.label)}
            onToggle={(label) => {
              const opt = HOME_TIME_OPTIONS.find((o) => o.label === label);
              if (opt) updateField("home_time_policy", opt.id);
            }}
            single
          />
        </Group>

        <Group title="Benefits">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BENEFIT_OPTIONS.map((b) => {
              const checked = benefits.includes(b);
              return (
                <label key={b} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted">
                  <Checkbox checked={checked} onCheckedChange={() => toggle("benefits", b)} />
                  <span className="text-sm">{b}</span>
                </label>
              );
            })}
          </div>
        </Group>
      </div>

      <div className="mt-12 flex justify-between">
        <PillButton type="button" variant="secondary" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</PillButton>
        <PillButton type="button" onClick={onFinish} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish & save"}
        </PillButton>
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{title}</div>
      {children}
    </div>
  );
}

function ChipGrid({
  items,
  selected,
  onToggle,
  single,
}: {
  items: string[];
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = selected.includes(it);
        return (
          <button
            type="button"
            key={it}
            onClick={() => onToggle(it)}
            className={`rounded-full px-4 py-2 text-sm border transition-colors ${
              on
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            {it}
            {single && on && " ✓"}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────
// Step 4 — Done
// ────────────────────────────────────────────────

function StepDone({ company }: { company: CompanyState }) {
  const summary = useMemo(
    () => [
      `${company.legal_name ?? "Carrier"} · DOT ${company.dot_number ?? "—"}`,
      `${company.power_units ?? "?"} power units · ${company.drivers_count ?? "?"} drivers`,
      `${company.preferred_lanes?.length ?? 0} lanes · ${company.equipment_types?.length ?? 0} equipment types`,
      `Pay $${company.pay_min ?? "?"}–$${company.pay_max ?? "?"} / mi`,
    ],
    [company],
  );

  return (
    <section className="text-center max-w-xl mx-auto py-12">
      <Eyebrow>You're live</Eyebrow>
      <DisplayHeading className="mt-3">Your carrier profile is ready.</DisplayHeading>
      <p className="mt-4 text-muted-foreground">
        Drivers matched to your lanes, pay, and culture will start appearing in your inbox.
      </p>

      <NCard className="mt-10 p-6 text-left">
        <ul className="space-y-2">
          {summary.map((line, i) => (
            <li key={i} className="text-sm text-foreground">• {line}</li>
          ))}
        </ul>
      </NCard>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/company/drivers">
          <PillButton>See matched drivers →</PillButton>
        </Link>
        <Link to="/company/map">
          <PillButton variant="secondary">Open driver map</PillButton>
        </Link>
      </div>
    </section>
  );
}