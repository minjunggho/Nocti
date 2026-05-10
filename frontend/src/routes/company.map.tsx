import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyCompany } from "@/lib/company.functions";
import { Eyebrow, DisplayHeading, NCard, MatchBadge } from "@/components/nocti/primitives";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { mockDrivers, demandLanes, type Company, type HomeTimePolicy } from "@/data/mock";
import { computeMatch } from "@/lib/match";
import { NoctiMap, type MapPin } from "@/components/nocti/NoctiMap";
import { MapFilterSheet, type MapFilterState } from "@/components/nocti/MapFilterSheet";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/company/map")({
  head: () => ({
    meta: [
      { title: "Driver map — Nocti" },
      { name: "description", content: "See where matched drivers are concentrated, with density and lane heatmaps." },
    ],
  }),
  component: CompanyMapPage,
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
    payRange: "",
    payMin: (row.pay_min as number) ?? 0,
    payMax: (row.pay_max as number) ?? 0,
    homeTime: "",
    homeTimePolicy: ((row.home_time_policy as HomeTimePolicy) ?? "weekly"),
    benefits: (row.benefits as string[]) ?? [],
    lanes: (row.preferred_lanes as string[]) ?? [],
    equipment: (row.equipment_types as string[]) ?? [],
    requiredEndorsements: row.hazmat_required ? ["Hazmat"] : [],
    experienceRange: EXPERIENCE_RANGE[exp] ?? [1, 3],
    terminals: row.hq_address ? [row.hq_address as string] : [],
    fmcsa: { safety: "", authority: "", inspections24mo: 0, oosRate: "" },
    about: "",
    distanceMi: 0,
    lat: 0, lng: 0,
  };
}

// Lightweight city → lat/lng map for HQ centering. Falls back to US center.
const CITY_COORDS: Record<string, [number, number]> = {
  "knoxville": [35.9606, -83.9207],
  "chattanooga": [35.0456, -85.3097],
  "nashville": [36.1627, -86.7816],
  "memphis": [35.1495, -90.0490],
  "atlanta": [33.7490, -84.3880],
  "birmingham": [33.5186, -86.8104],
  "louisville": [38.2527, -85.7585],
  "dallas": [32.7767, -96.7970],
  "houston": [29.7604, -95.3698],
  "miami": [25.7617, -80.1918],
  "chicago": [41.8781, -87.6298],
  "indianapolis": [39.7684, -86.1581],
};
function hqCoords(hq: string): [number, number] {
  const lower = hq.toLowerCase();
  for (const k in CITY_COORDS) if (lower.includes(k)) return CITY_COORDS[k];
  return [37.5, -88.0];
}

const EXP_OPTS = [
  { id: "junior", label: "0–2 yrs" },
  { id: "mid", label: "3–7 yrs" },
  { id: "senior", label: "8+ yrs" },
];
const EQUIP_OPTS = ["Dry van", "Reefer", "Flatbed", "Step deck"];
const HOMETIME_OPTS = [
  { id: "daily", label: "Home daily" },
  { id: "weekly", label: "Home weekly" },
  { id: "biweekly", label: "Home bi-weekly" },
  { id: "OTR", label: "OTR" },
];
const LANE_OPTS = ["SE regional", "Midwest", "TN ↔ TX", "TN ↔ FL", "FL produce", "48 states OTR", "TN ↔ OH"];

function CompanyMapPage() {
  const nav = useNavigate();
  const getMineFn = useServerFn(getMyCompany);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacy, setPrivacy] = useState(true);

  const [filters, setFilters] = useState<MapFilterState>({
    selected: {},
    payMin: 0,
    payMax: 1.5,
    showArcs: false,
    showRegions: false,
    showDensity: true,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { nav({ to: "/company/auth" }); return; }
      try {
        const row = await getMineFn();
        if (active) setCompany(row ? dbToCompany(row as Record<string, unknown>) : null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [nav, getMineFn]);

  const center: [number, number] = company?.hq ? hqCoords(company.hq) : [37.5, -88.0];

  const matched = useMemo(() => {
    if (!company) return [];
    return mockDrivers.map((d) => ({ d, m: computeMatch(d, company).match_score }));
  }, [company]);

  const filtered = useMemo(() => {
    const sel = filters.selected;
    const exp = sel.experience ?? [];
    const equip = sel.equipment ?? [];
    const ht = sel.hometime ?? [];
    const lanes = sel.lanes ?? [];
    return matched.filter(({ d }) => {
      if (d.desiredPayMax < filters.payMin || d.desiredPayMin > filters.payMax) return false;
      if (exp.length) {
        const bucket = d.yearsExp <= 2 ? "junior" : d.yearsExp <= 7 ? "mid" : "senior";
        if (!exp.includes(bucket)) return false;
      }
      if (equip.length && !equip.some((e) => d.preferences.equipment.includes(e))) return false;
      if (ht.length && !ht.includes(d.desiredHomeTime)) return false;
      if (lanes.length && !lanes.some((l) => d.preferences.preferredLanes.includes(l))) return false;
      return true;
    });
  }, [matched, filters]);

  const pins: MapPin[] = filtered.map(({ d, m }) => {
    const displayName = privacy
      ? `${d.firstName[0]}. ${d.lastName[0]}.`
      : `${d.firstName} ${d.lastName}`;
    return {
      id: d.id,
      lat: d.lat,
      lng: d.lng,
      matchScore: m,
      label: `${displayName} — ${m}% match`,
      popup: (
        <div style={{ minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9999, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Playfair Display, Georgia, serif", fontStyle: "italic" }}>
              {d.firstName[0]}{d.lastName[0]}
            </div>
            <div>
              <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 14 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{d.yearsExp} yrs · {d.homeBase}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#374151" }}>
            Wants ${d.desiredPayMin.toFixed(2)}–${d.desiredPayMax.toFixed(2)}/mi · {d.desiredHomeTime}
          </div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{m}% match</span>
            <a href={`/company/drivers/${d.id}`} style={{ fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>View driver →</a>
          </div>
        </div>
      ),
    };
  });

  // Active-lane heatmap = demandLanes weighted by how many filtered drivers
  // run lanes that contain the lane label keywords.
  const arcs = demandLanes.map((l) => {
    const keyword = l.label.split(" ")[0].toLowerCase();
    const intensity = Math.min(1, filtered.filter(({ d }) =>
      d.preferences.preferredLanes.some((pl) => pl.toLowerCase().includes(keyword))
    ).length / Math.max(1, filtered.length));
    return { id: l.id, from: l.from, to: l.to, label: `${l.label}`, intensity: 0.3 + intensity * 0.7 };
  });

  const density = filtered.map(({ d }) => ({ lat: d.lat, lng: d.lng, weight: 1 }));

  const activeFilterCount =
    Object.values(filters.selected).reduce((acc, arr) => acc + arr.length, 0) +
    (filters.payMin > 0 || filters.payMax < 1.5 ? 1 : 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <Link to="/company" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <span className="text-sm font-serif italic">Nocti</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <Eyebrow>Driver map</Eyebrow>
        <DisplayHeading as="h2" className="mt-3">
          Drivers near <em className="italic">{company?.hq || "your HQ"}</em>.
        </DisplayHeading>

        <div className="mt-4 flex items-center gap-3">
          <Switch id="privacy" checked={privacy} onCheckedChange={setPrivacy} />
          <Label htmlFor="privacy" className="text-sm text-muted-foreground">Anonymize driver names</Label>
        </div>

        <div className="relative mt-6">
          <NCard className="overflow-hidden p-0">
            <NoctiMap
              className="h-[60vh] min-h-[460px] w-full"
              center={center}
              zoom={6}
              homeLabel={company?.hq ? `HQ — ${company.hq}` : "HQ"}
              pins={pins}
              arcs={arcs}
              density={density}
              showArcs={filters.showArcs}
              showDensity={filters.showDensity}
            />
          </NCard>

          <div className="absolute left-3 top-3 z-[400]">
            <MapFilterSheet
              badge={activeFilterCount || undefined}
              state={filters}
              setState={setFilters}
              overlays={[
                { id: "showDensity", label: "Driver density" },
                { id: "showArcs", label: "Active lanes" },
              ]}
              groups={[
                { id: "experience", label: "Experience", options: EXP_OPTS },
                { id: "equipment", label: "Equipment", options: EQUIP_OPTS.map((e) => ({ id: e, label: e })) },
                { id: "hometime", label: "Home time desired", options: HOMETIME_OPTS },
                { id: "lanes", label: "Preferred lanes", options: LANE_OPTS.map((l) => ({ id: l, label: l })) },
              ]}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <Legend color="#16a34a" label="80+ match" />
          <Legend color="#eab308" label="50–79" />
          <Legend color="#9ca3af" label="<50" />
          <span className="ml-auto">{filtered.length} drivers shown</span>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-2">
          {filtered.slice(0, 6).map(({ d, m }) => {
            const displayName = privacy ? `${d.firstName[0]}. ${d.lastName[0]}.` : `${d.firstName} ${d.lastName}`;
            return (
              <Link key={d.id} to="/company/drivers/$id" params={{ id: d.id }}>
                <NCard className="p-3 flex items-center gap-3 hover:bg-muted transition-colors">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-serif italic">
                    {d.firstName[0]}{d.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{d.yearsExp} yrs · {d.homeBase}</p>
                  </div>
                  <MatchBadge value={m} />
                </NCard>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
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