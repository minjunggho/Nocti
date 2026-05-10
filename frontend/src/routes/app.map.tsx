import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eyebrow, DisplayHeading, NCard, MatchBadge } from "@/components/nocti/primitives";
import { companies, currentDriverGeo, demandLanes, regionalRates } from "@/data/mock";
import { computeMatch } from "@/lib/match";
import { useDriver } from "@/lib/driver-context";
import { NoctiMap, type MapPin } from "@/components/nocti/NoctiMap";
import { MapFilterSheet, type MapFilterState } from "@/components/nocti/MapFilterSheet";

export const Route = createFileRoute("/app/map")({
  head: () => ({
    meta: [
      { title: "Map — Nocti" },
      { name: "description", content: "Interactive map of carriers hiring near you, color-coded by match." },
    ],
  }),
  component: MapPage,
});

const LANE_OPTIONS = ["SE regional", "Midwest", "TX ↔ SE", "Northeast", "OTR 48 states", "TN ↔ TX", "TN ↔ FL", "FL produce"];
const EQUIP_OPTIONS = ["Dry van", "Reefer", "Flatbed", "Step deck"];
const HOMETIME_OPTIONS = [
  { id: "daily", label: "Home daily" },
  { id: "weekly", label: "Home weekly" },
  { id: "biweekly", label: "Home bi-weekly" },
  { id: "OTR", label: "OTR" },
];
const BENEFIT_OPTIONS = ["Health", "Dental", "401k", "PTO", "Per diem", "Sign-on bonus"];
const SIZE_OPTIONS = [
  { id: "small", label: "Small (<50)" },
  { id: "mid", label: "Mid (50–150)" },
  { id: "large", label: "Large (150+)" },
];

function MapPage() {
  const { driver: currentDriver } = useDriver();

  const [filters, setFilters] = useState<MapFilterState>({
    selected: {},
    payMin: 0,
    payMax: 1.5,
    showArcs: false,
    showRegions: false,
    showDensity: false,
  });

  const matched = useMemo(
    () => companies.map((c) => ({ c, m: computeMatch(currentDriver, c) })),
    [currentDriver],
  );

  const filtered = useMemo(() => {
    const sel = filters.selected;
    const lanes = sel.lane ?? [];
    const equip = sel.equipment ?? [];
    const ht = sel.hometime ?? [];
    const bens = sel.benefits ?? [];
    const sizes = sel.size ?? [];

    return matched.filter(({ c }) => {
      if (c.payMax < filters.payMin || c.payMin > filters.payMax) return false;
      if (lanes.length && !lanes.some((l) => c.lanes.includes(l))) return false;
      if (equip.length && !equip.some((e) => c.equipment.includes(e))) return false;
      if (ht.length && !ht.includes(c.homeTimePolicy)) return false;
      if (bens.length && !bens.some((b) => c.benefits.some((x) => x.toLowerCase().includes(b.toLowerCase())))) return false;
      if (sizes.length) {
        const bucket = c.fleet < 50 ? "small" : c.fleet < 150 ? "mid" : "large";
        if (!sizes.includes(bucket)) return false;
      }
      return true;
    });
  }, [matched, filters]);

  const pins: MapPin[] = filtered.map(({ c, m }) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    matchScore: m.match_score,
    label: `${c.name} — ${m.match_score}% match`,
    popup: (
      <div style={{ minWidth: 220 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <img src={c.logo} alt="" style={{ width: 36, height: 36, borderRadius: 6 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 14 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{c.hq} · {c.payRange}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#374151" }}>{c.headline}</div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600 }}>{m.match_score}% match</span>
          <a
            href={`/app/companies/${c.id}`}
            style={{ fontSize: 12, fontWeight: 600, textDecoration: "underline" }}
          >View company →</a>
        </div>
      </div>
    ),
  }));

  const activeFilterCount =
    Object.values(filters.selected).reduce((acc, arr) => acc + arr.length, 0) +
    (filters.payMin > 0 || filters.payMax < 1.5 ? 1 : 0);

  return (
    <div className="px-5 pt-8 pb-12">
      <Eyebrow>On the map</Eyebrow>
      <DisplayHeading as="h2" className="mt-3">
        Carriers near <em className="italic">{currentDriver.homeBase}</em>.
      </DisplayHeading>

      <div className="relative mt-6">
        <NCard className="overflow-hidden p-0">
          <NoctiMap
            className="h-[60vh] min-h-[420px] w-full"
            center={[currentDriverGeo.lat, currentDriverGeo.lng]}
            zoom={6}
            homeLabel={`Home base — ${currentDriver.homeBase}`}
            pins={pins}
            arcs={demandLanes.map((l) => ({ id: l.id, from: l.from, to: l.to, label: `${l.label} · $${l.rate.toFixed(2)}/mi`, intensity: (l.rate - 2.4) / 0.5 }))}
            regions={regionalRates.map((r) => ({ id: r.id, label: r.label, center: r.center, rate: r.rate }))}
            showArcs={filters.showArcs}
            showRegions={filters.showRegions}
          />
        </NCard>

        <div className="absolute left-3 top-3 z-[400]">
          <MapFilterSheet
            badge={activeFilterCount || undefined}
            state={filters}
            setState={setFilters}
            overlays={[
              { id: "showArcs", label: "Hot lanes" },
              { id: "showRegions", label: "Regional rates" },
            ]}
            groups={[
              { id: "lane", label: "Lane type", options: LANE_OPTIONS.map((l) => ({ id: l, label: l })) },
              { id: "equipment", label: "Equipment", options: EQUIP_OPTIONS.map((e) => ({ id: e, label: e })) },
              { id: "hometime", label: "Home time", options: HOMETIME_OPTIONS },
              { id: "benefits", label: "Benefits", options: BENEFIT_OPTIONS.map((b) => ({ id: b, label: b })) },
              { id: "size", label: "Company size", options: SIZE_OPTIONS },
            ]}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <Legend color="#16a34a" label="80+ match" />
        <Legend color="#eab308" label="50–79" />
        <Legend color="#9ca3af" label="<50" />
        <span className="ml-auto">{filtered.length} carriers shown</span>
      </div>

      <div className="mt-6 space-y-2">
        {filtered.slice(0, 6).map(({ c, m }) => (
          <Link key={c.id} to="/app/companies/$id" params={{ id: c.id }}>
            <NCard className="p-3 flex items-center gap-3 hover:bg-muted transition-colors">
              <img src={c.logo} alt="" className="h-9 w-9 rounded-md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-serif truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.distanceMi} mi · {c.payRange}</p>
              </div>
              <MatchBadge value={m.match_score} />
            </NCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}