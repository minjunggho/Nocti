import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { companies, type Company } from "@/data/mock";
import { computeMatch } from "@/lib/match";
import { DriverProvider, useDriver } from "@/lib/driver-context";
import { DriverHeader } from "@/components/nocti/DriverHeader";
import { Eyebrow, DisplayHeading } from "@/components/nocti/primitives";
import { Input } from "@/components/ui/input";
import {
  Search, ArrowRight, Bookmark, Mail, AlertTriangle,
  ChevronDown, ChevronUp, SlidersHorizontal, X, Map as MapIcon, List,
} from "lucide-react";

export const Route = createFileRoute("/driver/carriers/")({
  head: () => ({
    meta: [
      { title: "Carriers matched to you — Nocti" },
      { name: "description", content: "Carriers ranked by your lanes, pay, and home time." },
    ],
  }),
  component: () => (
    <DriverProvider>
      <CarriersPage />
    </DriverProvider>
  ),
});

const ACCENT = "#5B7FFF";
const HOME_TIME_OPTIONS: { v: "daily" | "weekly" | "biweekly" | "OTR"; l: string }[] = [
  { v: "daily", l: "Home daily" }, { v: "weekly", l: "Home weekly" },
  { v: "biweekly", l: "2-3 weeks out" }, { v: "OTR", l: "OTR" },
];
const REGIONS = ["Northeast", "Southeast", "Midwest", "South Central", "Mountain West", "West Coast"];
const EQUIPMENT = ["Dry van", "Reefer", "Flatbed", "Tanker", "Auto Hauler", "Step deck"];
const BENEFITS = ["Health", "401k", "PTO", "Per diem", "Sign-on bonus"];
const SIZE_OPTIONS: { v: string; l: string }[] = [
  { v: "<10", l: "<10" }, { v: "10-50", l: "10-50" }, { v: "50-200", l: "50-200" }, { v: "200+", l: "200+" },
];

type Sort = "match" | "pay" | "distance" | "newest";
type Stage = "all" | "saved" | "messaged" | "convo" | "passed";

function matchColorHex(score: number) {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#D97706";
  return "#71717A";
}

function CarriersPage() {
  const { driver } = useDriver();
  const [view, setView] = useState<"list" | "map">("list");
  const [sort, setSort] = useState<Sort>("match");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [minPay, setMinPay] = useState(driver.desiredPayMin);
  const [payCovers, setPayCovers] = useState(true);
  const [homeTimes, setHomeTimes] = useState<string[]>([]);
  const [matchLanes, setMatchLanes] = useState(true);
  const [origins, setOrigins] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [radius, setRadius] = useState<"100" | "250" | "500" | "any">("any");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [hideHazmat, setHideHazmat] = useState(false);

  // Pipeline
  const [stage, setStage] = useState<Stage>("all");
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set(["ridgeline", "ironpine", "blueforge", "summit", "cedarline"]));
  const [messagedSet] = useState<Set<string>>(new Set(["ridgeline", "ironpine"]));
  const [convoSet] = useState<Set<string>>(new Set(["ridgeline"]));
  const [passedSet, setPassedSet] = useState<Set<string>>(new Set(["northstar"]));

  const driverHasHazmat = driver.endorsements.some((e) => e.toLowerCase().includes("hazmat"));

  // Augment with mock hazmat-required for variance
  const augmented = useMemo(() => {
    return companies.map((c) => {
      const requiresHazmat = c.id === "northstar" || c.id === "ironpine";
      return { ...c, requiredEndorsements: requiresHazmat ? [...c.requiredEndorsements, "Hazmat"] : c.requiredEndorsements };
    });
  }, []);

  const scored = useMemo(() => {
    return augmented.map((c) => {
      const m = computeMatch(driver, c);
      return { company: c, score: m.match_score, reasons: m.top_reasons, disqualifiers: m.hard_disqualifiers };
    });
  }, [driver, augmented]);

  const stageCounts = useMemo(() => ({
    saved: savedSet.size, messaged: messagedSet.size, convo: convoSet.size, passed: passedSet.size,
  }), [savedSet, messagedSet, convoSet, passedSet]);

  const filtered = useMemo(() => {
    const fleetInBucket = (fleet: number, bucket: string) => {
      if (bucket === "<10") return fleet < 10;
      if (bucket === "10-50") return fleet >= 10 && fleet < 50;
      if (bucket === "50-200") return fleet >= 50 && fleet < 200;
      if (bucket === "200+") return fleet >= 200;
      return false;
    };

    let list = scored.filter((r) => {
      if (stage === "saved" && !savedSet.has(r.company.id)) return false;
      if (stage === "messaged" && !messagedSet.has(r.company.id)) return false;
      if (stage === "convo" && !convoSet.has(r.company.id)) return false;
      if (stage === "passed" && !passedSet.has(r.company.id)) return false;
      if (stage !== "passed" && passedSet.has(r.company.id)) return false;

      if (r.company.payMax < minPay) return false;
      if (payCovers && r.company.payMin > driver.desiredPayMin) {
        // strictly: their min should be ≤ driver's min so they cover the range
        if (r.company.payMin > driver.desiredPayMax) return false;
      }
      if (homeTimes.length > 0 && !homeTimes.includes(r.company.homeTimePolicy)) return false;
      if (radius !== "any" && r.company.distanceMi > parseInt(radius)) return false;
      if (equipment.length > 0 && !equipment.some((e) => r.company.equipment.some((ce) => ce.toLowerCase().includes(e.toLowerCase())))) return false;
      if (benefits.length > 0 && !benefits.every((b) => r.company.benefits.some((cb) => cb.toLowerCase().includes(b.toLowerCase())))) return false;
      if (sizes.length > 0 && !sizes.some((s) => fleetInBucket(r.company.fleet, s))) return false;
      if (hideHazmat && !driverHasHazmat && r.company.requiredEndorsements.includes("Hazmat")) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${r.company.name} ${r.company.hq} ${r.company.lanes.join(" ")} ${r.company.equipment.join(" ")} ${r.company.benefits.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sort === "match") return b.score - a.score;
      if (sort === "pay") return b.company.payMax - a.company.payMax;
      if (sort === "distance") return a.company.distanceMi - b.company.distanceMi;
      return 0;
    });
    return list;
  }, [scored, stage, savedSet, messagedSet, convoSet, passedSet, minPay, payCovers, driver.desiredPayMin, driver.desiredPayMax, homeTimes, radius, equipment, benefits, sizes, hideHazmat, driverHasHazmat, query, sort]);

  const toggleExpand = (id: string) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id); else n.add(id);
    setExpanded(n);
  };
  const toggleSave = (id: string) => {
    const n = new Set(savedSet);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSavedSet(n);
  };
  const passCarrier = (id: string) => {
    const n = new Set(passedSet); n.add(id); setPassedSet(n);
  };

  const filterRail = (
    <FilterRail
      query={query} setQuery={setQuery}
      minPay={minPay} setMinPay={setMinPay}
      payCovers={payCovers} setPayCovers={setPayCovers}
      homeTimes={homeTimes} setHomeTimes={setHomeTimes}
      matchLanes={matchLanes} setMatchLanes={setMatchLanes}
      origins={origins} setOrigins={setOrigins}
      destinations={destinations} setDestinations={setDestinations}
      radius={radius} setRadius={setRadius}
      equipment={equipment} setEquipment={setEquipment}
      benefits={benefits} setBenefits={setBenefits}
      sizes={sizes} setSizes={setSizes}
      hideHazmat={hideHazmat} setHideHazmat={setHideHazmat}
      driverHasHazmat={driverHasHazmat}
    />
  );

  const activeFilterCount = [
    homeTimes.length, origins.length, destinations.length, equipment.length, benefits.length, sizes.length,
    radius !== "any" ? 1 : 0, hideHazmat ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-background pb-24">
      <DriverHeader />

      <div className="px-6 md:px-10 py-8">
        <Eyebrow>Carriers matched to you</Eyebrow>
        <DisplayHeading className="mt-2 text-3xl sm:text-4xl">Carriers ranked <em className="italic">for you</em>.</DisplayHeading>
        <p className="mt-2 text-sm text-body">Scored against your lanes, pay, home time, and benefits.</p>

        {/* Pipeline strip */}
        <PipelineStrip stage={stage} setStage={setStage} counts={stageCounts} total={scored.length} />

        {/* Mobile filter trigger */}
        <div className="lg:hidden mt-4">
          <button
            type="button" onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-full text-sm"
          ><SlidersHorizontal className="h-4 w-4" />Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-2">
            {filterRail}
          </aside>

          <section>
            <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                Showing <span className="text-foreground font-medium">{filtered.length}</span> carrier{filtered.length === 1 ? "" : "s"} · sorted by{" "}
                <select
                  value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                  className="bg-transparent border-b border-foreground/30 text-foreground font-medium focus:outline-none cursor-pointer"
                >
                  <option value="match">Best match</option>
                  <option value="pay">Highest pay</option>
                  <option value="distance">Closest</option>
                  <option value="newest">Newest</option>
                </select>
              </p>
              <div className="inline-flex border border-border rounded-full p-0.5">
                <button
                  type="button" onClick={() => setView("list")}
                  className="px-3 py-1 text-xs rounded-full inline-flex items-center gap-1 transition-colors"
                  style={view === "list" ? { backgroundColor: ACCENT, color: "white" } : { color: "var(--muted-foreground)" }}
                ><List className="h-3 w-3" /> List</button>
                <Link
                  to="/driver/map"
                  className="px-3 py-1 text-xs rounded-full inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                ><MapIcon className="h-3 w-3" /> Map</Link>
              </div>
            </div>

            <div className="divide-y divide-border">
              {filtered.map(({ company, score, reasons, disqualifiers }) => (
                <CarrierRow
                  key={company.id}
                  company={company} score={score} reasons={reasons} disqualifiers={disqualifiers}
                  expanded={expanded.has(company.id)} onToggleExpand={() => toggleExpand(company.id)}
                  saved={savedSet.has(company.id)} onToggleSave={() => toggleSave(company.id)}
                  onPass={() => passCarrier(company.id)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="p-10 text-center">
                  <p className="font-serif italic text-xl text-foreground">No carriers match this combination.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try widening{" "}
                    <button onClick={() => setRadius("any")} className="underline text-foreground hover:opacity-70">distance</button>
                    {" "}or{" "}
                    <button onClick={() => setHomeTimes([])} className="underline text-foreground hover:opacity-70">home time</button>.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Mobile filters bottom sheet */}
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
    </main>
  );
}

// ---------- Pipeline strip ----------
function PipelineStrip({
  stage, setStage, counts, total,
}: { stage: Stage; setStage: (s: Stage) => void; counts: { saved: number; messaged: number; convo: number; passed: number }; total: number }) {
  const stages: { key: Stage; label: string; count: number }[] = [
    { key: "all", label: "All matches", count: total },
    { key: "saved", label: "Saved", count: counts.saved },
    { key: "messaged", label: "Messaged", count: counts.messaged },
    { key: "convo", label: "In conversation", count: counts.convo },
    { key: "passed", label: "Passed", count: counts.passed },
  ];
  return (
    <div className="mt-8 -mx-6 md:mx-0 px-6 md:px-0 overflow-x-auto">
      <div className="flex items-stretch gap-8 md:gap-12 min-w-max md:min-w-0">
        {stages.map((s) => {
          const active = stage === s.key;
          return (
            <button
              key={s.key} type="button" onClick={() => setStage(s.key)}
              className="flex flex-col items-start text-left relative pb-3"
            >
              <span
                className="font-serif text-3xl leading-none"
                style={{ color: active ? ACCENT : s.count === 0 ? "var(--muted-foreground)" : "var(--foreground)" }}
              >{s.count}</span>
              <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">{s.label}</span>
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: ACCENT }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Filter rail ----------
type FilterRailProps = {
  query: string; setQuery: (v: string) => void;
  minPay: number; setMinPay: (v: number) => void;
  payCovers: boolean; setPayCovers: (v: boolean) => void;
  homeTimes: string[]; setHomeTimes: (v: string[]) => void;
  matchLanes: boolean; setMatchLanes: (v: boolean) => void;
  origins: string[]; setOrigins: (v: string[]) => void;
  destinations: string[]; setDestinations: (v: string[]) => void;
  radius: "100" | "250" | "500" | "any"; setRadius: (v: "100" | "250" | "500" | "any") => void;
  equipment: string[]; setEquipment: (v: string[]) => void;
  benefits: string[]; setBenefits: (v: string[]) => void;
  sizes: string[]; setSizes: (v: string[]) => void;
  hideHazmat: boolean; setHideHazmat: (v: boolean) => void;
  driverHasHazmat: boolean;
};

function FilterRail(p: FilterRailProps) {
  const toggleArr = (arr: string[], v: string, set: (a: string[]) => void) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  return (
    <div className="space-y-2">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={p.query} onChange={(e) => p.setQuery(e.target.value)}
          placeholder="Search by name, lane, benefit…" className="h-9 pl-9 text-sm"
        />
      </div>

      <FilterGroup title="Pay" defaultOpen>
        <FieldLabel>Min pay/mile: <span className="text-foreground">${p.minPay.toFixed(2)}</span></FieldLabel>
        <input
          type="range" min={0.5} max={1.0} step={0.01} value={p.minPay}
          onChange={(e) => p.setMinPay(parseFloat(e.target.value))}
          className="w-full" style={{ accentColor: ACCENT }}
        />
        <Toggle label="Pay covers my range" value={p.payCovers} onChange={p.setPayCovers} className="mt-3" />
      </FilterGroup>

      <FilterGroup title="Home time">
        <ChipMulti options={HOME_TIME_OPTIONS.map((o) => o.l)} selected={p.homeTimes.map((v) => HOME_TIME_OPTIONS.find((o) => o.v === v)?.l || v)}
          onToggle={(label) => {
            const opt = HOME_TIME_OPTIONS.find((o) => o.l === label);
            if (opt) toggleArr(p.homeTimes, opt.v, p.setHomeTimes);
          }}
        />
      </FilterGroup>

      <FilterGroup title="Lanes">
        <Toggle label="Match my preferred lanes" value={p.matchLanes} onChange={p.setMatchLanes} />
        <FieldLabel className="mt-3">Origin region</FieldLabel>
        <ChipMulti options={REGIONS} selected={p.origins} onToggle={(v) => toggleArr(p.origins, v, p.setOrigins)} />
        <FieldLabel className="mt-3">Destination region</FieldLabel>
        <ChipMulti options={REGIONS} selected={p.destinations} onToggle={(v) => toggleArr(p.destinations, v, p.setDestinations)} />
      </FilterGroup>

      <FilterGroup title="Location">
        <FieldLabel>Distance from my home base</FieldLabel>
        <SegmentedControl
          options={[{ v: "100", l: "100mi" }, { v: "250", l: "250mi" }, { v: "500", l: "500mi" }, { v: "any", l: "Any" }]}
          value={p.radius} onChange={(v) => p.setRadius(v as "100" | "250" | "500" | "any")}
        />
      </FilterGroup>

      <FilterGroup title="Equipment">
        <ChipMulti options={EQUIPMENT} selected={p.equipment} onToggle={(v) => toggleArr(p.equipment, v, p.setEquipment)} />
      </FilterGroup>

      <FilterGroup title="Benefits required">
        <ChipMulti options={BENEFITS} selected={p.benefits} onToggle={(v) => toggleArr(p.benefits, v, p.setBenefits)} />
      </FilterGroup>

      <FilterGroup title="Company size">
        <ChipMulti options={SIZE_OPTIONS.map((s) => s.l)} selected={p.sizes} onToggle={(v) => toggleArr(p.sizes, v, p.setSizes)} />
      </FilterGroup>

      {!p.driverHasHazmat && (
        <FilterGroup title="Hazmat">
          <Toggle label="Hide carriers requiring Hazmat" value={p.hideHazmat} onChange={p.setHideHazmat} />
        </FilterGroup>
      )}

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
        type="button" onClick={() => setOpen(!open)}
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
      <span className="relative inline-block w-8 h-4 rounded-full transition-colors" style={{ backgroundColor: value ? ACCENT : "var(--border)" }}>
        <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" style={{ left: value ? "1.125rem" : "0.125rem" }} />
      </span>
    </button>
  );
}

// ---------- Carrier row ----------
function CarrierRow({
  company, score, reasons, disqualifiers,
  expanded, onToggleExpand, saved, onToggleSave, onPass,
}: {
  company: Company; score: number; reasons: string[]; disqualifiers: string[];
  expanded: boolean; onToggleExpand: () => void;
  saved: boolean; onToggleSave: () => void;
  onPass: () => void;
}) {
  const initial = company.name[0];
  return (
    <div className="group relative py-5 hover:bg-[#FAFAF9] -mx-3 px-3 rounded-lg transition-colors">
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-5 items-start">
        {/* Letter mark */}
        <div
          className="h-9 w-9 rounded-md flex items-center justify-center font-serif text-base flex-shrink-0 mt-1"
          style={{ backgroundColor: "color-mix(in oklab, " + ACCENT + " 10%, white)", color: ACCENT }}
        >{initial}</div>

        {/* Main */}
        <div className="min-w-0">
          <Link to="/driver/carriers/$id" params={{ id: company.id }} className="font-serif text-xl text-foreground hover:underline">
            {company.name}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">{company.hq} · {company.fleet} trucks</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {[
              company.payRange,
              company.homeTime,
              `${company.distanceMi}mi from you`,
              company.equipment.slice(0, 2).join(" + "),
            ].filter(Boolean).join(" · ")}
          </p>

          {reasons.length > 0 && (
            <div className="mt-3 space-y-1 text-sm">
              {(expanded ? reasons : reasons.slice(0, 2)).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-foreground">
                  <span style={{ color: "#059669" }}>✓</span><span>{r}</span>
                </div>
              ))}
              {reasons.length > 2 && (
                <button type="button" onClick={onToggleExpand} className="text-xs text-muted-foreground hover:text-foreground">
                  {expanded ? "Show less" : `+${reasons.length - 2} more reason${reasons.length - 2 === 1 ? "" : "s"}`}
                </button>
              )}
            </div>
          )}

          {disqualifiers.length > 0 && (
            <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: "var(--destructive)" }}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{disqualifiers[0]}</span>
            </div>
          )}
          {company.requiredEndorsements.includes("Hazmat") && disqualifiers.length === 0 && (
            <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: "var(--destructive)" }}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>Requires Hazmat endorsement</span>
            </div>
          )}
        </div>

        {/* Match score */}
        <div className="text-center min-w-[64px]">
          <div className="font-serif italic text-[28px] leading-none" style={{ color: matchColorHex(score) }}>{score}</div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">Match</div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            <IconBtn label={saved ? "Saved" : "Save"} onClick={onToggleSave} active={saved}><Bookmark className="h-4 w-4" /></IconBtn>
            <IconBtn label="Message"><Mail className="h-4 w-4" /></IconBtn>
          </div>
          <Link
            to="/driver/carriers/$id" params={{ id: company.id }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
          >View profile <ArrowRight className="h-3.5 w-3.5" /></Link>
          <button
            type="button" onClick={onPass}
            className="text-[11px] text-muted-foreground hover:text-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >Pass</button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} title={label}
      className="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors"
      style={active
        ? { color: ACCENT, backgroundColor: "color-mix(in oklab, " + ACCENT + " 10%, white)" }
        : { color: "var(--muted-foreground)" }}
    >{children}</button>
  );
}
