import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { PillButton } from "@/components/nocti/primitives";
import { SlidersHorizontal } from "lucide-react";

export type Toggle = { id: string; label: string };

export type MapFilterState = {
  selected: Record<string, string[]>; // groupId -> selected option ids
  payMin: number;
  payMax: number;
  showArcs: boolean;
  showRegions: boolean;
  showDensity: boolean;
};

export type FilterGroup = { id: string; label: string; options: Toggle[] };

export function MapFilterSheet({
  groups,
  state,
  setState,
  overlays,
  badge,
}: {
  groups: FilterGroup[];
  state: MapFilterState;
  setState: (s: MapFilterState) => void;
  overlays: { id: keyof Pick<MapFilterState, "showArcs" | "showRegions" | "showDensity">; label: string }[];
  badge?: number;
}) {
  const toggle = (groupId: string, opt: string) => {
    const cur = state.selected[groupId] ?? [];
    const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
    setState({ ...state, selected: { ...state.selected, [groupId]: next } });
  };
  const reset = () =>
    setState({ ...state, selected: {}, payMin: 0, payMax: 1.5 });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-2 text-xs font-medium shadow-sm hover:bg-muted"
          style={{ minHeight: 36 }}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {badge ? (
            <span className="ml-1 rounded-full bg-foreground text-background px-1.5 text-[10px]">{badge}</span>
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Map filters</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Overlays</h3>
            <div className="flex flex-wrap gap-2">
              {overlays.map((o) => {
                const active = state[o.id];
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setState({ ...state, [o.id]: !active })}
                    className={`rounded-full border px-3 py-1.5 text-xs ${active ? "bg-foreground text-background border-foreground" : "border-border text-foreground"}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Pay range ({state.payMin.toFixed(2)} – {state.payMax.toFixed(2)} $/mi)
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={1.5} step={0.05} value={state.payMin}
                onChange={(e) => setState({ ...state, payMin: Math.min(parseFloat(e.target.value), state.payMax) })}
                className="flex-1"
              />
              <input
                type="range" min={0} max={1.5} step={0.05} value={state.payMax}
                onChange={(e) => setState({ ...state, payMax: Math.max(parseFloat(e.target.value), state.payMin) })}
                className="flex-1"
              />
            </div>
          </section>

          {groups.map((g) => (
            <section key={g.id}>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{g.label}</h3>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const active = (state.selected[g.id] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(g.id, o.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs ${active ? "bg-foreground text-background border-foreground" : "border-border text-foreground"}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <SheetFooter className="mt-6 flex-row gap-2">
          <PillButton variant="secondary" onClick={reset}>Reset</PillButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}