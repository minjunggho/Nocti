import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyCompany } from "@/lib/company.functions";
import { type Company, type Driver, type HomeTimePolicy } from "@/data/mock";
import {
  adaptApiDriverToDriver,
  deleteAllDrivers,
  deleteDriver,
  listDrivers,
  updateDriver,
  type ApiDriver,
} from "@/lib/api";
import { computeMatch } from "@/lib/match";
import { Eyebrow, DisplayHeading } from "@/components/nocti/primitives";
import { Input } from "@/components/ui/input";
import {
  Loader2, Search, AlertTriangle, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Phone, MessageSquare, Bookmark, ArrowRight, X, SlidersHorizontal, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { OutreachDialog } from "@/components/nocti/OutreachDialog";
import { EntityFormDialog, type FieldDef } from "@/components/nocti/EntityFormDialog";

export const Route = createFileRoute("/company/drivers/")({
  head: () => ({
    meta: [
      { title: "Driver pipeline — Nocti" },
      { name: "description", content: "Drivers matched to your fleet — pipeline view." },
    ],
  }),
  component: DriversDashboard,
});

const EXPERIENCE_RANGE: Record<string, [number, number]> = {
  entry: [0, 1], "1-3": [1, 3], "3-5": [3, 5], "5+": [5, 40],
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
    payRange: row.pay_min != null && row.pay_max != null
      ? `$${(row.pay_min as number).toFixed(2)} – $${(row.pay_max as number).toFixed(2)} / mi` : "",
    payMin: (row.pay_min as number) ?? 0,
    payMax: (row.pay_max as number) ?? 0,
    homeTime: row.home_time_policy === "daily" ? "Home daily"
      : row.home_time_policy === "weekly" ? "Home weekly"
      : row.home_time_policy === "biweekly" ? "Home every 2–3 weeks" : "OTR",
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
    distanceMi: 0, lat: 0, lng: 0,
  };
}

type SortKey = "match" | "newest" | "lastActive" | "closest" | "experience";
type Stage = "new" | "reached" | "responded" | "screen" | "hired";

const ACCENT = "#5B7FFF";

const REGIONS = ["Northeast", "Southeast", "Midwest", "South Central", "Mountain West", "West Coast"];
const ENDORSEMENTS = ["Hazmat", "Tanker", "Doubles/Triples", "TWIC", "Passenger"];
const EQUIPMENT_TYPES = ["Dry Van", "Reefer", "Flatbed", "Tanker", "Auto Hauler", "Step Deck"];

// Deterministic mock derivations from driver id
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function deriveStage(id: string, match: number): Stage {
  const h = hashStr(id);
  if (match >= 80 && h % 7 === 0) return "screen";
  if (match >= 70 && h % 5 === 0) return "responded";
  if (match >= 60 && h % 3 === 0) return "reached";
  return "new";
}
function deriveLastActiveDays(id: string) { return (hashStr(id) % 14) + 1; }
function deriveDistance(id: string) { return ((hashStr(id) * 7) % 480) + 20; }

function DriversDashboard() {
  const nav = useNavigate();
  const getMineFn = useServerFn(getMyCompany);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rawDrivers, setRawDrivers] = useState<ApiDriver[]>([]);
  const [editing, setEditing] = useState<ApiDriver | null>(null);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [originRegions, setOriginRegions] = useState<string[]>([]);
  const [destRegions, setDestRegions] = useState<string[]>([]);
  const [matchActiveLanes, setMatchActiveLanes] = useState(true);
  const [radius, setRadius] = useState<"100" | "250" | "500" | "any">("any");
  const [yearsMin, setYearsMin] = useState(0);
  const [endorsements, setEndorsements] = useState<string[]>([]);
  const [cdlClass, setCdlClass] = useState<"any" | "A" | "B">("any");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(["Looking", "Open to offers"]);
  const [lastActive, setLastActive] = useState<"24h" | "7d" | "30d" | "any">("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [payOverlap, setPayOverlap] = useState(true);
  const [hideDisqualifiers, setHideDisqualifiers] = useState(true);
  const [minMatch, setMinMatch] = useState(0);
  const [sort, setSort] = useState<SortKey>("match");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { nav({ to: "/company/auth" }); return; }
      try {
        const row = await getMineFn();
        if (active) setCompany(row ? dbToCompany(row as Record<string, unknown>) : null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't load your carrier profile");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [nav, getMineFn]);

  const refreshDrivers = async () => {
    setDriversLoading(true); setDriversError(null);
    try {
      const res = await listDrivers();
      setRawDrivers(res.drivers);
      setDrivers(res.drivers.map(adaptApiDriverToDriver));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't load drivers";
      setDriversError(msg); toast.error(msg);
    } finally { setDriversLoading(false); }
  };
  useEffect(() => { void refreshDrivers(); }, []);

  const onDeleteDriver = async (id: string) => {
    if (!confirm("Delete this driver?")) return;
    setActionBusy(true);
    try { await deleteDriver(id); toast.success("Driver deleted"); await refreshDrivers(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setActionBusy(false); }
  };
  const onDeleteAllDrivers = async () => {
    if (!confirm("Delete ALL drivers? This cannot be undone.")) return;
    setActionBusy(true);
    try { await deleteAllDrivers(); toast.success("All drivers deleted"); await refreshDrivers(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setActionBusy(false); }
  };

  const onEditDriver = (id: string) => {
    const raw = rawDrivers.find((d) => String(d.id) === id);
    if (raw) setEditing(raw);
  };

  const scored = useMemo(() => {
    return drivers.map((d) => {
      const m = company ? computeMatch(d, company) : { match_score: 0, hard_disqualifiers: [], top_reasons: [] };
      return {
        driver: d,
        match: m.match_score,
        disqualifiers: m.hard_disqualifiers,
        reasons: m.top_reasons,
        stage: deriveStage(d.id, m.match_score),
        lastActiveDays: deriveLastActiveDays(d.id),
        distanceMi: deriveDistance(d.id),
      };
    });
  }, [drivers, company]);

  const stageCounts = useMemo(() => {
    const c = { new: 0, reached: 0, responded: 0, screen: 0, hired: 0 };
    scored.forEach((r) => { c[r.stage]++; });
    return c;
  }, [scored]);

  const filtered = useMemo(() => {
    let list = scored.filter((r) => {
      if (stage !== "all" && r.stage !== stage) return false;
      if (r.match < minMatch) return false;
      if (hideDisqualifiers && r.disqualifiers.length > 0) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(r.driver.status)) return false;
      if (yearsMin > 0 && r.driver.yearsExp < yearsMin) return false;
      if (radius !== "any" && r.distanceMi > parseInt(radius)) return false;
      if (endorsements.length > 0 && !endorsements.every((e) => r.driver.endorsements.includes(e))) return false;
      if (equipment.length > 0 && !equipment.some((e) => r.driver.preferences.equipment.some((pe) => pe.toLowerCase().includes(e.toLowerCase())))) return false;
      if (lastActive !== "any") {
        const limit = lastActive === "24h" ? 1 : lastActive === "7d" ? 7 : 30;
        if (r.lastActiveDays > limit) return false;
      }
      if (verifiedOnly && !r.driver.documents.some((d) => d.name.includes("CDL") && d.status === "Verified")) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${r.driver.firstName} ${r.driver.lastName} ${r.driver.homeBase} ${r.driver.endorsements.join(" ")} ${r.driver.preferences.preferredLanes.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === "match") return b.match - a.match;
      if (sort === "experience") return b.driver.yearsExp - a.driver.yearsExp;
      if (sort === "lastActive") return a.lastActiveDays - b.lastActiveDays;
      if (sort === "closest") return a.distanceMi - b.distanceMi;
      return a.driver.lastName.localeCompare(b.driver.lastName);
    });
    return list;
  }, [scored, stage, minMatch, hideDisqualifiers, statusFilter, yearsMin, radius, endorsements, equipment, lastActive, verifiedOnly, query, sort]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></main>;
  }

  const filterRail = (
    <FilterRail
      query={query} setQuery={setQuery}
      originRegions={originRegions} setOriginRegions={setOriginRegions}
      destRegions={destRegions} setDestRegions={setDestRegions}
      matchActiveLanes={matchActiveLanes} setMatchActiveLanes={setMatchActiveLanes}
      radius={radius} setRadius={setRadius}
      yearsMin={yearsMin} setYearsMin={setYearsMin}
      endorsements={endorsements} setEndorsements={setEndorsements}
      cdlClass={cdlClass} setCdlClass={setCdlClass}
      equipment={equipment} setEquipment={setEquipment}
      statusFilter={statusFilter} setStatusFilter={setStatusFilter}
      lastActive={lastActive} setLastActive={setLastActive}
      verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly}
      payOverlap={payOverlap} setPayOverlap={setPayOverlap}
      hideDisqualifiers={hideDisqualifiers} setHideDisqualifiers={setHideDisqualifiers}
      minMatch={minMatch} setMinMatch={setMinMatch}
    />
  );

  const activeFilterCount = [
    originRegions.length, destRegions.length, endorsements.length, equipment.length,
    radius !== "any" ? 1 : 0, yearsMin > 0 ? 1 : 0, lastActive !== "any" ? 1 : 0,
    verifiedOnly ? 1 : 0, minMatch > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-serif italic text-xl">Nocti</Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/company/drivers" className="text-foreground" activeOptions={{ exact: true }}>Drivers</Link>
              <Link to="/company/jobs" className="text-muted-foreground hover:text-foreground">Jobs</Link>
              <Link to="/company/benchmarks" className="text-muted-foreground hover:text-foreground">Benchmarks</Link>
              <Link to="/company" className="text-muted-foreground hover:text-foreground">Profile</Link>
              <Link to="/company/map" className="text-muted-foreground hover:text-foreground">Map</Link>
            </nav>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); nav({ to: "/company/auth" }); }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >Sign out</button>
        </div>
      </header>

      <div className="px-6 md:px-10 py-8">
        <Eyebrow>Driver pipeline</Eyebrow>
        <DisplayHeading className="mt-2 text-3xl sm:text-4xl">Drivers matched <em className="italic">to your fleet</em>.</DisplayHeading>

        {!company && (
          <div className="mt-6 p-4 flex items-start gap-3 border border-dashed border-border rounded-lg">
            <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">You haven't finished onboarding.{" "}
              <Link to="/company" className="underline text-foreground">Complete your carrier profile →</Link>
            </div>
          </div>
        )}

        {/* Pipeline funnel */}
        <PipelineFunnel stage={stage} setStage={setStage} counts={stageCounts} total={scored.length} />

        {/* Mobile filters trigger */}
        <div className="lg:hidden mt-4">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-full text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Filter rail (desktop) */}
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-2">
            {filterRail}
          </aside>

          {/* Main content */}
          <section>
            {/* Sort + bulk actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                {driversLoading ? "Loading drivers…" : (
                  <>Showing <span className="text-foreground font-medium">{filtered.length}</span> driver{filtered.length === 1 ? "" : "s"} · sorted by{" "}
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="bg-transparent border-b border-foreground/30 text-foreground font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="match">Best match</option>
                      <option value="newest">Newest</option>
                      <option value="lastActive">Last active</option>
                      <option value="closest">Closest to terminal</option>
                      <option value="experience">Highest experience</option>
                    </select>
                  </>
                )}
              </p>
              <div className="flex items-center gap-3">
                {selected.size > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{selected.size} selected</span>
                    <button className="px-3 py-1.5 rounded-full text-white text-xs" style={{ backgroundColor: ACCENT }}>Add to outreach</button>
                    <button className="px-3 py-1.5 rounded-full border border-border text-xs hover:bg-muted">Save</button>
                    <button className="px-3 py-1.5 rounded-full border border-border text-xs hover:bg-muted">Pass</button>
                  </div>
                )}
                <button
                  type="button" onClick={() => void refreshDrivers()}
                  disabled={driversLoading || actionBusy}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                ><RefreshCw className={`h-3.5 w-3.5 ${driversLoading ? "animate-spin" : ""}`} />Refresh</button>
                {drivers.length > 0 && (
                  <button
                    type="button" onClick={() => void onDeleteAllDrivers()}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-1.5 text-xs text-destructive hover:opacity-80 disabled:opacity-50"
                  ><Trash2 className="h-3.5 w-3.5" />Delete all</button>
                )}
              </div>
            </div>

            {driversError && !driversLoading && (
              <div className="mt-4 p-4 text-sm text-destructive border border-destructive/40 rounded-lg">{driversError}</div>
            )}

            <div className="divide-y divide-border">
              {filtered.map((r) => (
                <DriverRow
                  key={r.driver.id}
                  data={r}
                  hasCompany={!!company}
                  company={company}
                  selected={selected.has(r.driver.id)}
                  onToggleSelect={() => toggleSelect(r.driver.id)}
                  expanded={expanded.has(r.driver.id)}
                  onToggleExpand={() => toggleExpand(r.driver.id)}
                  onDelete={() => void onDeleteDriver(r.driver.id)}
                  onEdit={() => onEditDriver(r.driver.id)}
                  deleting={actionBusy}
                />
              ))}
              {filtered.length === 0 && !driversLoading && (
                <EmptyState
                  hasDrivers={drivers.length > 0}
                  onRelaxRadius={() => setRadius("any")}
                  onRelaxYears={() => setYearsMin(0)}
                />
              )}
              {driversLoading && drivers.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading drivers…
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif italic text-xl">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {filterRail}
          </div>
        </div>
      )}

      {editing && (
        <EntityFormDialog
          open={!!editing}
          onOpenChange={(v) => { if (!v) setEditing(null); }}
          title={`Edit driver — ${editing.name ?? editing.id}`}
          fields={DRIVER_FIELDS}
          initial={{
            name: editing.name ?? "",
            experience_years: editing.experience_years ?? null,
            vehicle_type: editing.vehicle_type ?? "",
            home_city: editing.home_city ?? "",
            home_state: editing.home_state ?? "",
            preferred_lane_type: editing.preferred_lane_type ?? "",
            desired_home_time: editing.desired_home_time ?? "",
            pay_priority: editing.pay_priority ?? "",
            communication_preference: editing.communication_preference ?? "",
            burnout_concerns: editing.burnout_concerns ?? "",
          }}
          onSubmit={async (vals) => {
            await updateDriver(editing.id, vals as Partial<ApiDriver>);
            toast.success("Driver updated");
            setEditing(null);
            await refreshDrivers();
          }}
        />
      )}
    </main>
  );
}

const DRIVER_FIELDS: FieldDef[] = [
  { key: "name", label: "Name" },
  { key: "experience_years", label: "Experience (years)", type: "number" },
  { key: "vehicle_type", label: "Vehicle type" },
  { key: "home_city", label: "Home city" },
  { key: "home_state", label: "Home state" },
  { key: "preferred_lane_type", label: "Preferred lane type" },
  { key: "desired_home_time", label: "Desired home time" },
  { key: "pay_priority", label: "Pay priority" },
  { key: "communication_preference", label: "Communication preference" },
  { key: "burnout_concerns", label: "Burnout concerns", type: "textarea" },
];

// ---------- Pipeline Funnel ----------
function PipelineFunnel({
  stage, setStage, counts, total,
}: { stage: Stage | "all"; setStage: (s: Stage | "all") => void; counts: Record<Stage, number>; total: number }) {
  const stages: { key: Stage | "all"; label: string; count: number }[] = [
    { key: "all", label: "All matches", count: total },
    { key: "new", label: "New matches", count: counts.new },
    { key: "reached", label: "Reached out", count: counts.reached },
    { key: "responded", label: "Responded", count: counts.responded },
    { key: "screen", label: "Phone screen", count: counts.screen },
    { key: "hired", label: "Hired this month", count: counts.hired },
  ];
  return (
    <div className="mt-8 -mx-6 md:mx-0 px-6 md:px-0 overflow-x-auto">
      <div className="flex items-stretch gap-8 md:gap-12 min-w-max md:min-w-0">
        {stages.map((s, i) => {
          const active = stage === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStage(s.key)}
              className="group flex flex-col items-start text-left relative pb-3"
            >
              <span
                className="font-serif text-4xl leading-none"
                style={{ color: active ? ACCENT : s.count === 0 ? "var(--muted-foreground)" : "var(--foreground)" }}
              >
                {s.count}
              </span>
              <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                {s.label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: ACCENT }} />
              )}
              {i < stages.length - 1 && (
                <span className="hidden md:block absolute top-3 -right-7 text-muted-foreground/40">→</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Filter Rail ----------
type FilterRailProps = {
  query: string; setQuery: (v: string) => void;
  originRegions: string[]; setOriginRegions: (v: string[]) => void;
  destRegions: string[]; setDestRegions: (v: string[]) => void;
  matchActiveLanes: boolean; setMatchActiveLanes: (v: boolean) => void;
  radius: "100" | "250" | "500" | "any"; setRadius: (v: "100" | "250" | "500" | "any") => void;
  yearsMin: number; setYearsMin: (v: number) => void;
  endorsements: string[]; setEndorsements: (v: string[]) => void;
  cdlClass: "any" | "A" | "B"; setCdlClass: (v: "any" | "A" | "B") => void;
  equipment: string[]; setEquipment: (v: string[]) => void;
  statusFilter: string[]; setStatusFilter: (v: string[]) => void;
  lastActive: "24h" | "7d" | "30d" | "any"; setLastActive: (v: "24h" | "7d" | "30d" | "any") => void;
  verifiedOnly: boolean; setVerifiedOnly: (v: boolean) => void;
  payOverlap: boolean; setPayOverlap: (v: boolean) => void;
  hideDisqualifiers: boolean; setHideDisqualifiers: (v: boolean) => void;
  minMatch: number; setMinMatch: (v: number) => void;
};

function FilterRail(p: FilterRailProps) {
  const toggleArr = (arr: string[], v: string, setter: (a: string[]) => void) => {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  return (
    <div className="space-y-2">
      {/* Search inside rail */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={p.query}
          onChange={(e) => p.setQuery(e.target.value)}
          placeholder="Search by name, lane, endorsement…"
          className="h-9 pl-9 text-sm"
        />
      </div>

      <FilterGroup title="Lanes" defaultOpen>
        <FieldLabel>Origin region</FieldLabel>
        <ChipMulti options={REGIONS} selected={p.originRegions} onToggle={(v) => toggleArr(p.originRegions, v, p.setOriginRegions)} />
        <FieldLabel className="mt-3">Destination region</FieldLabel>
        <ChipMulti options={REGIONS} selected={p.destRegions} onToggle={(v) => toggleArr(p.destRegions, v, p.setDestRegions)} />
        <Toggle label="Match my active lanes" value={p.matchActiveLanes} onChange={p.setMatchActiveLanes} className="mt-3" />
      </FilterGroup>

      <FilterGroup title="Location">
        <FieldLabel>Home base radius from terminal</FieldLabel>
        <SegmentedControl
          options={[{ v: "100", l: "100mi" }, { v: "250", l: "250mi" }, { v: "500", l: "500mi" }, { v: "any", l: "Any" }]}
          value={p.radius}
          onChange={(v) => p.setRadius(v as "100" | "250" | "500" | "any")}
        />
      </FilterGroup>

      <FilterGroup title="Experience & endorsements">
        <FieldLabel>Years driving: <span className="text-foreground">{p.yearsMin}{p.yearsMin >= 20 ? "+" : ""}</span></FieldLabel>
        <input
          type="range" min={0} max={20} value={p.yearsMin}
          onChange={(e) => p.setYearsMin(parseInt(e.target.value))}
          className="w-full accent-foreground"
          style={{ accentColor: ACCENT }}
        />
        <FieldLabel className="mt-3">Required endorsements</FieldLabel>
        <ChipMulti options={ENDORSEMENTS} selected={p.endorsements} onToggle={(v) => toggleArr(p.endorsements, v, p.setEndorsements)} />
        <FieldLabel className="mt-3">CDL class</FieldLabel>
        <SegmentedControl
          options={[{ v: "any", l: "Any" }, { v: "A", l: "Class A" }, { v: "B", l: "Class B" }]}
          value={p.cdlClass}
          onChange={(v) => p.setCdlClass(v as "any" | "A" | "B")}
        />
        <FieldLabel className="mt-3">Equipment experience</FieldLabel>
        <ChipMulti options={EQUIPMENT_TYPES} selected={p.equipment} onToggle={(v) => toggleArr(p.equipment, v, p.setEquipment)} />
      </FilterGroup>

      <FilterGroup title="Status & activity">
        <FieldLabel>Driver status</FieldLabel>
        <ChipMulti
          options={["Looking", "Open to offers", "Employed"]}
          selected={p.statusFilter}
          onToggle={(v) => toggleArr(p.statusFilter, v, p.setStatusFilter)}
        />
        <FieldLabel className="mt-3">Last active</FieldLabel>
        <SegmentedControl
          options={[{ v: "24h", l: "24h" }, { v: "7d", l: "7d" }, { v: "30d", l: "30d" }, { v: "any", l: "Any" }]}
          value={p.lastActive}
          onChange={(v) => p.setLastActive(v as "24h" | "7d" | "30d" | "any")}
        />
        <Toggle label="Verified CDL only" value={p.verifiedOnly} onChange={p.setVerifiedOnly} className="mt-3" />
      </FilterGroup>

      <FilterGroup title="Pay">
        <Toggle label="Overlaps my pay range" value={p.payOverlap} onChange={p.setPayOverlap} />
      </FilterGroup>

      <FilterGroup title="Match quality">
        <Toggle label="Hide hard disqualifiers" value={p.hideDisqualifiers} onChange={p.setHideDisqualifiers} />
        <FieldLabel className="mt-3">Min match score: <span className="text-foreground">{p.minMatch}</span></FieldLabel>
        <input
          type="range" min={0} max={100} value={p.minMatch}
          onChange={(e) => p.setMinMatch(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: ACCENT }}
        />
      </FilterGroup>

      <button
        type="button"
        className="w-full mt-4 py-2.5 text-sm border border-foreground/20 rounded-full hover:bg-muted transition-colors"
      >Save this search</button>
    </div>
  );
}

function FilterGroup({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border first:border-t-0 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <span>{title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="mt-3 space-y-1">{children}</div>}
    </div>
  );
}

function FieldLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs text-muted-foreground mb-1.5 ${className}`}>{children}</p>;
}

function ChipMulti({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o} type="button" onClick={() => onToggle(o)}
            className="px-2.5 py-1 text-xs rounded-full border transition-colors"
            style={active
              ? { backgroundColor: ACCENT, borderColor: ACCENT, color: "white" }
              : { borderColor: "var(--border)", color: "var(--foreground)" }}
          >{o}</button>
        );
      })}
    </div>
  );
}

function SegmentedControl<T extends string>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex border border-border rounded-full p-0.5 w-full">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v} type="button" onClick={() => onChange(o.v)}
            className="flex-1 px-2 py-1 text-xs rounded-full transition-colors"
            style={active ? { backgroundColor: ACCENT, color: "white" } : { color: "var(--muted-foreground)" }}
          >{o.l}</button>
        );
      })}
    </div>
  );
}

function Toggle({ label, value, onChange, className = "" }: { label: string; value: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button" onClick={() => onChange(!value)}
      className={`flex items-center justify-between w-full text-xs ${className}`}
    >
      <span className="text-foreground">{label}</span>
      <span
        className="relative inline-block w-8 h-4 rounded-full transition-colors"
        style={{ backgroundColor: value ? ACCENT : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
          style={{ left: value ? "1.125rem" : "0.125rem" }}
        />
      </span>
    </button>
  );
}

// ---------- Driver Row ----------
function matchColorHex(score: number) {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#D97706";
  return "#71717A";
}

type RowData = {
  driver: Driver;
  match: number;
  disqualifiers: string[];
  reasons: string[];
  stage: Stage;
  lastActiveDays: number;
  distanceMi: number;
};

function DriverRow({
  data, hasCompany, company, selected, onToggleSelect, expanded, onToggleExpand, onDelete, onEdit, deleting,
}: {
  data: RowData; hasCompany: boolean; company: Company | null;
  selected: boolean; onToggleSelect: () => void;
  expanded: boolean; onToggleExpand: () => void;
  onDelete?: () => void; onEdit?: () => void; deleting?: boolean;
}) {
  const { driver, match, disqualifiers, reasons, lastActiveDays, distanceMi } = data;
  const [outreachOpen, setOutreachOpen] = useState(false);
  const statusDot = driver.status === "Looking" ? "#059669" : driver.status === "Open to offers" ? "#D97706" : "#71717A";
  const cdlDoc = driver.documents.find((d) => d.name.includes("CDL"));
  const cdlClass = cdlDoc?.name.includes("CDL-A") ? "CDL-A" : cdlDoc?.name.includes("CDL-B") ? "CDL-B" : "CDL-A";

  return (
    <div className="group relative py-5 hover:bg-[#FAFAF9] -mx-3 px-3 rounded-lg transition-colors">
      <div className="grid grid-cols-[auto_auto_1fr_auto] gap-5 items-start">
        {/* Checkbox */}
        <input
          type="checkbox" checked={selected} onChange={onToggleSelect}
          className="mt-2 h-4 w-4 rounded border-border accent-current"
          style={{ accentColor: ACCENT }}
        />

        {/* Match score - typographic */}
        <div className="text-center min-w-[64px]">
          <div
            className="font-serif italic text-[28px] leading-none"
            style={{ color: hasCompany ? matchColorHex(match) : "#71717A" }}
          >{hasCompany ? match : "—"}</div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">Match</div>
        </div>

        {/* Main content */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              to="/company/drivers/$id" params={{ id: driver.id }}
              className="font-serif text-xl text-foreground hover:underline"
            >
              {driver.firstName} <em className="italic">{driver.lastName}</em>
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusDot }} />
              {driver.status === "Open to offers" ? "Open" : driver.status}
            </span>
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {[
              `${driver.yearsExp} yrs`,
              driver.homeBase,
              `${distanceMi}mi from terminal`,
              driver.preferences.equipment.slice(0, 2).join(" + ") || "—",
              cdlClass,
              ...driver.endorsements.slice(0, 2),
              `Last active ${lastActiveDays}d ago`,
            ].filter(Boolean).join(" · ")}
          </p>

          {/* Match reasons */}
          {hasCompany && reasons.length > 0 && (
            <div className="mt-3 space-y-1 text-sm">
              {(expanded ? reasons : reasons.slice(0, 2)).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-foreground">
                  <span style={{ color: "#059669" }}>✓</span>
                  <span>{r}</span>
                </div>
              ))}
              {reasons.length > 2 && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded ? "Show less" : `+${reasons.length - 2} more factor${reasons.length - 2 === 1 ? "" : "s"}`}
                </button>
              )}
            </div>
          )}

          {/* Hard disqualifier */}
          {disqualifiers.length > 0 && (
            <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: "var(--destructive)" }}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{disqualifiers[0]}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            <IconBtn label="Call" onClick={() => window.open(`tel:${driver.phone}`)}><Phone className="h-4 w-4" /></IconBtn>
            <IconBtn label="Text" onClick={() => setOutreachOpen(true)}><MessageSquare className="h-4 w-4" /></IconBtn>
            <IconBtn label="Save"><Bookmark className="h-4 w-4" /></IconBtn>
          </div>
          <Link
            to="/company/drivers/$id" params={{ id: driver.id }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
          >View profile <ArrowRight className="h-3.5 w-3.5" /></Link>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            <button className="text-[11px] text-muted-foreground hover:text-foreground">Pass</button>
            {onEdit && (
              <button
                type="button" onClick={onEdit}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              ><Pencil className="h-3 w-3" />Edit</button>
            )}
            {onDelete && (
              <button
                type="button" onClick={onDelete} disabled={deleting}
                className="text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-50"
              >Delete</button>
            )}
          </div>
        </div>
      </div>
      <OutreachDialog open={outreachOpen} onOpenChange={setOutreachOpen} driver={driver} company={company} />
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} title={label}
      className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >{children}</button>
  );
}

// ---------- Empty state ----------
function EmptyState({ hasDrivers, onRelaxRadius, onRelaxYears }: { hasDrivers: boolean; onRelaxRadius: () => void; onRelaxYears: () => void }) {
  if (!hasDrivers) {
    return <div className="p-10 text-center text-sm text-muted-foreground">No drivers in the backend yet.</div>;
  }
  return (
    <div className="p-10 text-center">
      <p className="font-serif italic text-xl text-foreground">No drivers match this combination.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Loosen{" "}
        <button onClick={onRelaxRadius} className="underline text-foreground hover:opacity-70">home base radius</button>
        {" "}or{" "}
        <button onClick={onRelaxYears} className="underline text-foreground hover:opacity-70">years of experience</button>
        {" "}to widen the pool.
      </p>
    </div>
  );
}
