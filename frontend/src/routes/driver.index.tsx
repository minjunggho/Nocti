import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverProvider, useDriver } from "@/lib/driver-context";
import {
  companies, hotLanes, demandLanes, regionalRates,
  currentDriverGeo, type Status, type Company,
} from "@/data/mock";
import { computeMatch } from "@/lib/match";
import {
  Loader2, ArrowRight, ArrowUpRight, ArrowDownRight,
  MessageSquare, Maximize2,
} from "lucide-react";
import { DriverHeader } from "@/components/nocti/DriverHeader";
import { TalkToNoctiSheet } from "@/components/nocti/TalkToNoctiSheet";
import { NoctiMap, type MapPin } from "@/components/nocti/NoctiMap";

export const Route = createFileRoute("/driver/")({
  head: () => ({
    meta: [
      { title: "Driver dashboard — Nocti" },
      { name: "description", content: "Live market data, top matches, and your standing this week." },
    ],
  }),
  component: DriverDashboardWrapper,
});

const ACCENT = "#5B7FFF";
const ACCENT_TINT = "color-mix(in oklab, #5B7FFF 8%, white)";
const ACCENT_TINT_STRONG = "color-mix(in oklab, #5B7FFF 14%, white)";
const BORDER = "#E7E5E4";
const STATUSES: Status[] = ["Looking", "Open to offers", "Employed"];
const SECTION_LABEL = "text-[10px] uppercase tracking-[0.18em]";

function DriverDashboardWrapper() {
  return (
    <DriverProvider>
      <DriverDashboardPage />
    </DriverProvider>
  );
}

function statusDot(s: Status) {
  if (s === "Looking") return "#059669";
  if (s === "Open to offers") return "#D97706";
  return "#71717A";
}
function matchColorHex(score: number) {
  if (score >= 70) return "#059669";
  if (score >= 50) return "#D97706";
  return "#71717A";
}

function DriverDashboardPage() {
  const { driver, setDriver } = useDriver();
  const [authChecked, setAuthChecked] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mapTab, setMapTab] = useState<"carriers" | "lanes" | "demand">("carriers");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().finally(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, []);

  const ranked = useMemo(
    () =>
      companies
        .map((c) => {
          const m = computeMatch(driver, c);
          return { company: c, score: m.match_score, reason: m.top_reasons[0] || "", reasons: m.top_reasons };
        })
        .sort((a, b) => b.score - a.score),
    [driver],
  );
  const topMatches = ranked.slice(0, 3);
  const topMatch = ranked[0];

  const driverPayMid = (driver.desiredPayMin + driver.desiredPayMax) / 2;
  const marketAvg = 0.81;
  const rateDelta = driverPayMid - marketAvg;

  const initials = `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`;

  const mapPins: MapPin[] = useMemo(() => {
    if (mapTab !== "carriers") return [];
    return ranked.map(({ company, score }) => ({
      id: company.id,
      lat: company.lat, lng: company.lng,
      matchScore: score,
      label: company.name,
      popup: (
        <div className="text-xs">
          <div className="font-serif text-base">{company.name}</div>
          <div className="text-[#71717A] mt-0.5">{company.hq} · {score} match</div>
          <div className="mt-1.5 text-[#52525B]">{company.payRange}</div>
          <a href={`/driver/carriers/${company.id}`} className="mt-2 inline-block" style={{ color: ACCENT }}>
            View profile →
          </a>
        </div>
      ),
    }));
  }, [ranked, mapTab]);

  if (!authChecked) {
    return <main className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></main>;
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      <DriverHeader />

      <div className="mx-auto max-w-[1280px] px-8 pt-10 pb-12">
        {/* Greeting + status segmented control */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className={SECTION_LABEL} style={{ color: ACCENT }}>Dashboard</p>
            <h1 className="mt-2 text-[34px] leading-tight tracking-tight">
              <span className="font-serif italic">Hey {driver.firstName}.</span>
            </h1>
            <p className="mt-2 text-sm text-[#71717A]">Here's where you stand this week.</p>
          </div>
          <div
            className="inline-flex items-center p-1 rounded-full border self-start"
            style={{ borderColor: BORDER, backgroundColor: "#FAFAF9" }}
            role="tablist"
            aria-label="Job seeking status"
          >
            {STATUSES.map((s) => {
              const on = driver.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setDriver({ ...driver, status: s })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-colors"
                  style={{
                    backgroundColor: on ? "#FFFFFF" : "transparent",
                    boxShadow: on ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    color: on ? "#0A0A0A" : "#52525B",
                    border: on ? `1px solid ${BORDER}` : "1px solid transparent",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusDot(s) }} />
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile label="Your rate vs market">
            <p className="font-serif text-3xl tabular-nums">${driverPayMid.toFixed(2)} <span className="text-sm text-[#71717A]">/ mi</span></p>
            <p className="mt-1.5 text-[12px] inline-flex items-center gap-1" style={{ color: rateDelta >= 0 ? "#059669" : "#DC2626" }}>
              {rateDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {rateDelta >= 0 ? "+" : "–"}${Math.abs(rateDelta).toFixed(2)} vs market avg
            </p>
          </KpiTile>
          <KpiTile label="Carriers viewing you">
            <div className="flex items-end justify-between gap-3">
              <p className="font-serif text-3xl tabular-nums">12 <span className="text-sm text-[#71717A]">this wk</span></p>
              <Sparkline values={[5, 6, 7, 6, 9, 11, 12]} className="h-7 w-16" />
            </div>
            <p className="mt-1.5 text-[12px] inline-flex items-center gap-1" style={{ color: "#059669" }}>
              <ArrowUpRight className="h-3 w-3" /> +3 vs last week
            </p>
          </KpiTile>
          <KpiTile label="New matches">
            <div className="flex items-baseline justify-between">
              <p className="font-serif text-3xl tabular-nums">6</p>
              <Link to="/driver/carriers" className="text-[12px] inline-flex items-center gap-0.5" style={{ color: ACCENT }}>
                View <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-1.5 text-[12px] text-[#71717A]">Since last login</p>
          </KpiTile>
          <KpiTile label="Top match">
            {topMatch && (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="font-serif text-3xl tabular-nums" style={{ color: matchColorHex(topMatch.score) }}>{topMatch.score}</p>
                  <Link to="/driver/carriers/$id" params={{ id: topMatch.company.id }} className="text-[12px] inline-flex items-center gap-0.5" style={{ color: ACCENT }}>
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="mt-1.5 text-[12px] text-[#71717A] truncate">{topMatch.company.name}</p>
              </>
            )}
          </KpiTile>
        </div>

        {/* Main grid */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
          {/* LEFT */}
          <div className="space-y-10">
            {/* Map widget */}
            <section>
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <p className={SECTION_LABEL} style={{ color: ACCENT }}>Map</p>
                  <h2 className="mt-1.5 font-serif text-2xl">Your <em className="italic">market</em>.</h2>
                </div>
                <Link to="/driver/map" className="text-[12px] inline-flex items-center gap-1 text-[#52525B] hover:text-[#0A0A0A]">
                  <Maximize2 className="h-3.5 w-3.5" /> Full map
                </Link>
              </div>
              <div className="mt-4 inline-flex items-center p-1 rounded-full border" style={{ borderColor: BORDER, backgroundColor: "#FAFAF9" }}>
                {[
                  { id: "carriers", label: "Carriers" },
                  { id: "lanes", label: "Hot lanes" },
                  { id: "demand", label: "Demand heatmap" },
                ].map((t) => {
                  const on = mapTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMapTab(t.id as typeof mapTab)}
                      className="px-3 py-1.5 text-[12px] rounded-full transition-colors"
                      style={{
                        backgroundColor: on ? "#FFFFFF" : "transparent",
                        boxShadow: on ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        color: on ? "#0A0A0A" : "#52525B",
                        border: on ? `1px solid ${BORDER}` : "1px solid transparent",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 border rounded-xl overflow-hidden" style={{ borderColor: BORDER, height: 500 }}>
                <NoctiMap
                  center={[currentDriverGeo.lat, currentDriverGeo.lng]}
                  zoom={5}
                  homeLabel={driver.homeBase}
                  pins={mapPins}
                  arcs={demandLanes.map((d) => ({
                    id: d.id, from: d.from, to: d.to, label: `${d.label} · $${d.rate.toFixed(2)}/mi`,
                    intensity: Math.min(1, Math.max(0, (d.rate - 2.4) / 0.5)),
                  }))}
                  regions={regionalRates}
                  showArcs={mapTab === "lanes"}
                  showRegions={mapTab === "demand"}
                  className="h-full w-full"
                />
              </div>
            </section>

            {/* Top matches */}
            <section>
              <p className={SECTION_LABEL} style={{ color: ACCENT }}>Top matches</p>
              <h2 className="mt-1.5 font-serif text-2xl">Ranked <em className="italic">for you</em>.</h2>
              <div className="mt-5 space-y-2.5">
                {topMatches.map((m) => <CompactMatchRow key={m.company.id} match={m} />)}
              </div>
              <Link to="/driver/carriers" className="mt-4 inline-flex items-center gap-1 text-[13px]" style={{ color: ACCENT }}>
                See all matches <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="space-y-6">
            {/* Compact profile card */}
            <section className="border rounded-xl p-5" style={{ borderColor: BORDER }}>
              <div className="flex items-start gap-4">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center font-serif italic text-xl flex-shrink-0"
                  style={{ backgroundColor: ACCENT_TINT_STRONG, color: ACCENT }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif italic text-xl leading-tight">{driver.firstName} {driver.lastName}</h3>
                  <p className="mt-0.5 text-[12px] text-[#71717A]">{driver.yearsExp} yrs · CDL-A · {driver.homeBase}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {driver.endorsements.filter(e => e !== "CDL-A").slice(0, 4).map((e) => (
                  <span key={e} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: BORDER, color: "#52525B" }}>{e}</span>
                ))}
              </div>
              <Link to="/driver/profile" className="mt-3 inline-flex items-center gap-1 text-[12px]" style={{ color: ACCENT }}>
                Edit profile <ArrowRight className="h-3 w-3" />
              </Link>
            </section>

            {/* Profile strength */}
            <section className="border rounded-xl p-5" style={{ borderColor: BORDER }}>
              <p className={`${SECTION_LABEL} text-[#71717A]`}>Profile strength</p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="font-serif text-2xl tabular-nums">80<span className="text-sm text-[#71717A]">%</span></p>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F0EE" }}>
                <div className="h-full rounded-full" style={{ width: "80%", backgroundColor: ACCENT }} />
              </div>
              <p className="mt-3 text-[12px] text-[#52525B]">Add reefer cert to unlock 4 more matches.</p>
              <Link to="/driver/profile" className="mt-2 inline-flex items-center gap-1 text-[12px]" style={{ color: ACCENT }}>
                Complete profile <ArrowRight className="h-3 w-3" />
              </Link>
            </section>

            {/* Lane rate trend */}
            <section className="border rounded-xl p-5" style={{ borderColor: BORDER }}>
              <p className={`${SECTION_LABEL} text-[#71717A]`}>Market — this week</p>
              <h3 className="mt-1.5 font-serif text-xl">Your <em className="italic">lane rate</em>.</h3>
              <p className="mt-2 font-serif text-3xl tabular-nums">$2.68 <span className="text-sm text-[#71717A]">/ mi</span></p>
              <p className="mt-1 text-[12px] inline-flex items-center gap-1" style={{ color: "#059669" }}>
                <ArrowUpRight className="h-3 w-3" /> +$0.06 vs last week
              </p>
              <Sparkline values={[2.59, 2.61, 2.60, 2.64, 2.66, 2.65, 2.68]} className="mt-3 w-full h-[160px]" filled />
            </section>

            {/* Market alerts */}
            <section className="border rounded-xl p-5" style={{ borderColor: BORDER }}>
              <p className={`${SECTION_LABEL} text-[#71717A]`}>Market alerts</p>
              <ul className="mt-3 space-y-2.5 text-[13px]">
                <AlertRow tone="up">Atlanta → Dallas spiked +8% this week</AlertRow>
                <AlertRow tone="dot">3 new carriers in your range posted in last 24hr</AlertRow>
                <AlertRow tone="down">Knoxville → Miami down –2%</AlertRow>
              </ul>
            </section>

            {/* Hot lanes */}
            <section className="border rounded-xl p-5" style={{ borderColor: BORDER }}>
              <p className={`${SECTION_LABEL} text-[#71717A]`}>Hot lanes near you</p>
              <div className="mt-3 space-y-2">
                {hotLanes.slice(0, 3).map((l) => {
                  const up = l.change >= 0;
                  return (
                    <div key={l.lane} className="flex items-center justify-between text-[13px]">
                      <span className="text-[#0A0A0A] truncate pr-3">{l.lane}</span>
                      <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: up ? "#059669" : "#DC2626" }}>
                        ${l.rate.toFixed(2)} {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[12px] text-[#71717A]">Your asking ${driverPayMid.toFixed(2)}/mi</p>
            </section>

            {/* Talk to Nocti */}
            <section className="rounded-xl p-5" style={{ backgroundColor: ACCENT_TINT }}>
              <h3 className="font-serif text-lg">Need to think something <em className="italic">through</em>?</h3>
              <p className="mt-1.5 text-[12px] text-[#52525B]">Market questions, contract review, regulation help. Anytime.</p>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-white text-[13px] font-medium"
                style={{ backgroundColor: ACCENT }}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Talk to Nocti <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          </aside>
        </div>
      </div>

      <TalkToNoctiSheet open={chatOpen} onOpenChange={setChatOpen} />
    </main>
  );
}

function KpiTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-4" style={{ borderColor: BORDER }}>
      <p className={`${SECTION_LABEL} text-[#71717A]`}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function AlertRow({ tone, children }: { tone: "up" | "down" | "dot"; children: React.ReactNode }) {
  const color = tone === "up" ? "#059669" : tone === "down" ? "#DC2626" : ACCENT;
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[3px] flex-shrink-0" style={{ color }}>
        {tone === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : tone === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
      </span>
      <span className="text-[#0A0A0A] leading-snug">{children}</span>
    </li>
  );
}

function CompactMatchRow({ match }: { match: { company: Company; score: number; reason: string; reasons: string[] } }) {
  const { company, score, reasons } = match;
  const initial = company.name[0];
  return (
    <Link
      to="/driver/carriers/$id"
      params={{ id: company.id }}
      className="flex items-center gap-4 border rounded-lg p-3.5 hover:bg-[#FAFAF9] transition-colors"
      style={{ borderColor: BORDER }}
    >
      <div
        className="h-9 w-9 rounded-full flex items-center justify-center font-serif italic text-base flex-shrink-0"
        style={{ backgroundColor: ACCENT_TINT_STRONG, color: ACCENT }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-serif text-base leading-tight truncate">{company.name}</h3>
          <span className="text-[11px] text-[#71717A] truncate">{company.hq} · fleet {company.fleet}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {reasons.slice(0, 3).map((r) => (
            <span key={r} className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#F5F5F4", color: "#52525B" }}>
              {r}
            </span>
          ))}
        </div>
      </div>
      <div className="font-serif italic text-2xl leading-none tabular-nums flex-shrink-0" style={{ color: matchColorHex(score) }}>
        {score}
      </div>
    </Link>
  );
}

function Sparkline({ values, className, filled }: { values: number[]; className?: string; filled?: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 90 - 5;
    return `${x},${y}`;
  });
  const line = pts.join(" ");
  const area = `0,100 ${line} 100,100`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className}>
      {filled && <polygon points={area} fill={ACCENT} fillOpacity="0.08" />}
      <polyline points={line} fill="none" stroke={ACCENT} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
