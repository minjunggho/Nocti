import * as React from "react";
import type { Company, Driver } from "@/data/mock";
import { computeMatch, FACTOR_ORDER, type Factor, type FactorKey } from "@/lib/match";
import { Eyebrow, DisplayHeading, NCard } from "./primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Sparkles } from "lucide-react";

const WHY_TEXT: Record<FactorKey, string> = {
  lane_overlap: "Lanes you actually want to run matter most — biggest single factor in your overall fit.",
  pay_alignment: "Whether their pay range covers what you're asking for, with a bonus when the top end beats your target.",
  home_time: "How often they get you home, compared with the schedule you said you want.",
  equipment: "Trailers and freight types you prefer to pull. Required endorsements you don't hold zero this out.",
  experience: "Whether your years on the road sit inside their preferred range.",
  benefits: "Share of the benefits you listed that they actually offer.",
  geographic: "How close their nearest terminal is to your home base.",
};

function scoreLabel(score: number) {
  if (score >= 85) return { word: "Excellent", color: "var(--success, var(--accent))" };
  if (score >= 65) return { word: "Strong", color: "var(--accent)" };
  if (score >= 40) return { word: "Partial", color: "var(--accent)" };
  if (score > 0) return { word: "Weak", color: "var(--muted-foreground)" };
  return { word: "No fit", color: "var(--muted-foreground)" };
}

export function MatchBreakdown({ driver, company }: { driver: Driver; company: Company }) {
  const result = React.useMemo(() => computeMatch(driver, company), [driver, company]);
  const { match_score, factors, hard_disqualifiers, top_reasons } = result;

  return (
    <section>
      <Eyebrow>Match breakdown</Eyebrow>
      <DisplayHeading as="h3" className="mt-3">
        <em className="italic">{match_score}</em> out of 100.
      </DisplayHeading>

      {top_reasons.length > 0 && (
        <ul className="mt-5 space-y-2">
          {top_reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-body">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {hard_disqualifiers.length > 0 && (
        <NCard className="mt-5 p-3 flex gap-2 items-start" style={{ backgroundColor: "var(--accent-soft)" }}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
          <div className="text-sm text-foreground">
            {hard_disqualifiers.map((d, i) => <div key={i}>{d}</div>)}
          </div>
        </NCard>
      )}

      {/* Stacked weight bar — tap or hover any segment for detail */}
      <div className="mt-6">
        <div className="relative flex h-7 w-full overflow-hidden rounded-full bg-muted">
          {FACTOR_ORDER.map((k) => (
            <FactorSegment key={k} fkey={k} factor={factors[k]} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Tap a segment for detail</span>
          <span>100%</span>
        </div>
      </div>

      {/* Legend grid */}
      <div className="mt-6 space-y-2">
        {FACTOR_ORDER.map((k) => (
          <FactorRow key={k} fkey={k} factor={factors[k]} />
        ))}
      </div>
    </section>
  );
}

function FactorSegment({ fkey, factor }: { fkey: FactorKey; factor: Factor }) {
  const opacity = 0.22 + (factor.score / 100) * 0.78;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${factor.label}: ${factor.score} of 100, weight ${factor.weight} percent`}
          className="group relative h-full border-r border-background last:border-r-0 transition-all hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          style={{ width: `${factor.weight}%`, backgroundColor: "var(--accent)", opacity }}
        >
          {factor.weight >= 15 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium text-background/90 opacity-0 group-hover:opacity-100 transition-opacity">
              {factor.weight}%
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={8} className="w-72 p-0 text-xs">
        <FactorTooltip fkey={fkey} factor={factor} />
      </PopoverContent>
    </Popover>
  );
}

function FactorRow({ fkey, factor }: { fkey: FactorKey; factor: Factor }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full text-left rounded-md p-2 -mx-2 hover:bg-muted transition-colors">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-foreground">{factor.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {factor.score}<span className="text-muted-foreground/60">/100 · {factor.weight}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${factor.score}%`, backgroundColor: factor.score >= 70 ? "var(--accent)" : factor.score >= 40 ? "var(--accent)" : "var(--muted-foreground)", opacity: factor.score >= 40 ? 1 : 0.5 }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">{factor.detail}</p>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={8} className="w-72 p-0 text-xs">
        <FactorTooltip fkey={fkey} factor={factor} />
      </PopoverContent>
    </Popover>
  );
}

function FactorTooltip({ fkey, factor }: { fkey: FactorKey; factor: Factor }) {
  const label = scoreLabel(factor.score);
  const contribution = Math.round((factor.score * factor.weight) / 100);
  return (
    <div>
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{factor.label}</span>
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-medium"
            style={{ color: label.color }}
          >
            {label.word}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-serif text-2xl text-foreground tabular-nums">{factor.score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            Weight {factor.weight}%
          </span>
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${factor.score}%`, backgroundColor: "var(--accent)" }}
          />
        </div>
      </div>
      <div className="px-3 py-3 space-y-2">
        <p className="text-foreground leading-snug">{factor.detail}</p>
        <p className="text-muted-foreground leading-snug">{WHY_TEXT[fkey]}</p>
        <p className="pt-1 border-t border-border text-[11px] text-muted-foreground">
          Adds <span className="text-foreground tabular-nums">{contribution}</span> of {factor.weight} possible points to your overall score.
        </p>
      </div>
    </div>
  );
}
