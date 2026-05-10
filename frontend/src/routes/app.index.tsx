import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Eyebrow, DisplayHeading, NCard, MatchBadge } from "@/components/nocti/primitives";
import { CompanyCard } from "@/components/nocti/CompanyCard";
import { companies, marketSnapshot, hotLanes, activity, type Status } from "@/data/mock";
import { computeMatch } from "@/lib/match";
import { useDriver } from "@/lib/driver-context";
import { MessageCircle, Map as MapIcon, User, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Nocti — Home" }, { name: "description", content: "Your matched carriers, market rates, and activity." }] }),
  component: Dashboard,
});

const STATUSES: Status[] = ["Looking", "Open to offers", "Employed"];

function Dashboard() {
  const { driver: currentDriver } = useDriver();
  const [status, setStatus] = useState<Status>(currentDriver.status);
  const ranked = useMemo(
    () =>
      companies
        .map((c) => ({ c, score: computeMatch(currentDriver, c).match_score }))
        .sort((a, b) => b.score - a.score),
    [currentDriver],
  );
  const top3 = ranked.slice(0, 3);
  const nearby = ranked.slice(3).map((r) => r.c);

  return (
    <div className="px-5 pt-8 pb-12 space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">Good morning,</p>
        <DisplayHeading as="h2">{currentDriver.firstName}.</DisplayHeading>
        <div className="flex flex-wrap gap-2 pt-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
                status === s ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              {s === status && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)] align-middle" />}
              {s}
            </button>
          ))}
        </div>
      </header>

      <section>
        <Eyebrow>Matched for you</Eyebrow>
        <DisplayHeading as="h3" className="mt-3">
          Three carriers <em className="italic">worth your time</em>.
        </DisplayHeading>
        <div className="mt-5 -mx-5 px-5 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none">
          {top3.map(({ c, score }) => (
            <Link key={c.id} to="/app/companies/$id" params={{ id: c.id }} className="snap-start shrink-0 w-[78%]">
              <NCard className="p-4 h-full">
                <div className="flex items-center gap-3">
                  <img src={c.logo} alt="" className="h-10 w-10 rounded-md" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-base truncate">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">{c.hq}</p>
                  </div>
                  <MatchBadge value={score} />
                </div>
                <p className="mt-3 text-sm text-body line-clamp-2">{c.headline}</p>
                <div className="mt-3 text-xs text-body space-y-1">
                  <div>{c.payRange}</div>
                  <div className="text-muted-foreground">{c.homeTime}</div>
                </div>
              </NCard>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { to: "/app/nocti", label: "Talk to Nocti", icon: MessageCircle },
          { to: "/app/map", label: "View map", icon: MapIcon },
          { to: "/app/profile", label: "Edit profile", icon: User },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to as any}>
            <NCard className="p-3 text-center hover:bg-muted transition-colors">
              <Icon className="mx-auto h-5 w-5 text-foreground" strokeWidth={1.5} />
              <p className="mt-2 text-[11px] text-body leading-tight">{label}</p>
            </NCard>
          </Link>
        ))}
      </section>

      <section>
        <Eyebrow>Market snapshot</Eyebrow>
        <DisplayHeading as="h3" className="mt-3">
          Rates this <em className="italic">week</em>.
        </DisplayHeading>
        <NCard className="mt-5 p-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs text-muted-foreground">National avg</p>
              <p className="font-serif text-3xl mt-1">${marketSnapshot.nationalRate.toFixed(2)}<span className="text-base text-muted-foreground">/mi</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your lanes</p>
              <p className="font-serif text-3xl mt-1">${marketSnapshot.yourLaneRate.toFixed(2)}<span className="text-base text-muted-foreground">/mi</span></p>
              <p className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: "var(--success)" }}>
                <TrendingUp className="h-3 w-3" /> +${marketSnapshot.weekChange.toFixed(2)} wk/wk
              </p>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground">Fuel index</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="font-serif text-2xl">${marketSnapshot.fuelIndex.toFixed(2)}</p>
              <Sparkline data={marketSnapshot.fuelTrend} />
            </div>
          </div>
        </NCard>

        <div className="mt-4 space-y-2">
          {hotLanes.map((l) => (
            <NCard key={l.lane} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">{l.lane}</p>
                <p className="text-xs text-muted-foreground">${l.rate.toFixed(2)}/mi</p>
              </div>
              <span className={`text-xs inline-flex items-center gap-1 ${l.change >= 0 ? "text-[var(--success)]" : "text-muted-foreground"}`}>
                {l.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {l.change >= 0 ? "+" : ""}{l.change.toFixed(2)}
              </span>
            </NCard>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Hiring near you</Eyebrow>
            <DisplayHeading as="h3" className="mt-3">From <em className="italic">{currentDriver.homeBase}</em></DisplayHeading>
          </div>
          <Link to="/app/companies" className="text-sm text-foreground inline-flex items-center gap-1">All <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-5 space-y-3">
          {nearby.map((c) => <CompanyCard key={c.id} company={c} />)}
        </div>
      </section>

      <section>
        <Eyebrow>Recent activity</Eyebrow>
        <ul className="mt-5 space-y-3">
          {activity.map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
              <div className="flex-1">
                <p className="text-sm text-foreground">{a.text}</p>
                <p className="text-xs text-muted-foreground">{a.when}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 120, h = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
