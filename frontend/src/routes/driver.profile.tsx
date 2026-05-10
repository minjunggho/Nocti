import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DriverProvider, useDriver } from "@/lib/driver-context";
import { DriverHeader } from "@/components/nocti/DriverHeader";
import { Eyebrow, DisplayHeading, NCard, Chip, PillButton } from "@/components/nocti/primitives";
import { Pencil, Check, FileText, ShieldCheck } from "lucide-react";
import type { HomeTimePolicy } from "@/data/mock";

const LANE_OPTIONS = ["SE regional", "TN ↔ TX", "TN ↔ FL", "TN ↔ OH", "TN ↔ IL", "TN ↔ AR", "TN ↔ MS", "Midwest", "Northeast", "OTR 48 states", "FL produce", "SE → Midwest", "SE → TX", "TX ↔ GA"];
const EQUIP_OPTIONS = ["Dry van", "Reefer", "Flatbed", "Step deck", "Tanker", "Day cab"];
const BENEFIT_OPTIONS = ["Health insurance", "Dental", "Vision", "401k match", "Paid PTO", "Per diem", "Sign-on bonus", "Tarp pay"];
const HOME_TIME_OPTIONS: { id: HomeTimePolicy; label: string }[] = [
  { id: "daily", label: "Home daily" },
  { id: "weekly", label: "Home weekly" },
  { id: "biweekly", label: "Bi-weekly" },
  { id: "OTR", label: "OTR" },
];

export const Route = createFileRoute("/driver/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Nocti" },
      { name: "description", content: "Edit your driver profile, lanes, and preferences." },
    ],
  }),
  component: () => (
    <DriverProvider>
      <ProfilePage />
    </DriverProvider>
  ),
});

function ProfilePage() {
  const { driver: d, setDriver: setD } = useDriver();

  return (
    <main className="min-h-screen bg-background pb-24 overflow-x-hidden">
      <DriverHeader />
      <div className="mx-auto max-w-[1280px] px-8 py-8">
        <Eyebrow>Driver profile</Eyebrow>
        <DisplayHeading className="mt-2 text-3xl sm:text-4xl">Your <em className="italic">profile</em>.</DisplayHeading>
        <p className="mt-2 text-sm text-body max-w-2xl">
          Changes here re-rank your matches instantly.
        </p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          {/* LEFT — identity */}
          <aside className="lg:sticky lg:top-24 lg:self-start min-w-0 space-y-6">
            <NCard className="p-6 text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center font-serif italic text-3xl">
                {d.firstName[0]}{d.lastName[0]}
              </div>
              <p className="mt-4 font-serif text-xl">{d.firstName} <em className="italic">{d.lastName}</em></p>
              <p className="mt-1 text-xs text-muted-foreground">{d.yearsExp} yrs · {d.homeBase}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {d.endorsements.map((e) => (
                  <Chip key={e} className="bg-[var(--accent-soft)] border-transparent">
                    <ShieldCheck className="h-3 w-3 mr-1 inline" style={{ color: "var(--accent)" }} />{e}
                  </Chip>
                ))}
              </div>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Documents</Eyebrow>
              <div className="mt-4 space-y-2">
                {d.documents.map((doc) => (
                  <div key={doc.name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="flex-1 text-sm">{doc.name}</p>
                    <span className={`text-xs ${doc.status === "Verified" ? "text-[var(--success)]" : "text-muted-foreground"}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
              <PillButton variant="secondary" className="mt-4 w-full">Upload document</PillButton>
            </NCard>
          </aside>

          {/* RIGHT — editable */}
          <section className="space-y-6 min-w-0">
            <NCard className="p-6">
              <Eyebrow>About</Eyebrow>
              <div className="mt-3">
                <EditableText value={d.about} onChange={(v) => setD({ ...d, about: v })} multiline />
              </div>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Pay & home time</Eyebrow>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Desired pay ($/mi)</p>
                  <div className="flex items-center gap-2">
                    <NumberField value={d.desiredPayMin} step={0.01} onChange={(v) => setD({ ...d, desiredPayMin: v, preferences: { ...d.preferences, payPerMile: `${v.toFixed(2)} – ${d.desiredPayMax.toFixed(2)}` } })} />
                    <span className="text-muted-foreground">–</span>
                    <NumberField value={d.desiredPayMax} step={0.01} onChange={(v) => setD({ ...d, desiredPayMax: v, preferences: { ...d.preferences, payPerMile: `${d.desiredPayMin.toFixed(2)} – ${v.toFixed(2)}` } })} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Home time</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HOME_TIME_OPTIONS.map((o) => (
                      <ToggleChip key={o.id} active={d.desiredHomeTime === o.id} onClick={() => setD({ ...d, desiredHomeTime: o.id, preferences: { ...d.preferences, homeTime: o.label } })}>
                        {o.label}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
              </div>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Lanes & equipment</Eyebrow>
              <div className="mt-4 space-y-5">
                <MultiSelect label="Preferred lanes" options={LANE_OPTIONS} selected={d.preferences.preferredLanes} onToggle={(v) => setD({ ...d, preferences: { ...d.preferences, preferredLanes: toggle(d.preferences.preferredLanes, v) } })} />
                <MultiSelect label="Won't run" options={LANE_OPTIONS} selected={d.preferences.avoidLanes} onToggle={(v) => setD({ ...d, preferences: { ...d.preferences, avoidLanes: toggle(d.preferences.avoidLanes, v) } })} />
                <MultiSelect label="Equipment" options={EQUIP_OPTIONS} selected={d.preferences.equipment} onToggle={(v) => setD({ ...d, preferences: { ...d.preferences, equipment: toggle(d.preferences.equipment, v) } })} />
              </div>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Benefits wanted</Eyebrow>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {BENEFIT_OPTIONS.map((b) => (
                  <ToggleChip key={b} active={d.benefitsWanted.includes(b)} onClick={() => setD({ ...d, benefitsWanted: toggle(d.benefitsWanted, b) })}>
                    {b}
                  </ToggleChip>
                ))}
              </div>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Experience</Eyebrow>
              <ul className="mt-4 divide-y divide-border">
                {d.experience.map((x, i) => (
                  <li key={i} className="py-4 first:pt-0 last:pb-0">
                    <p className="font-serif text-base">{x.company}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{x.tenure}</p>
                    <p className="text-sm text-body mt-1.5">{x.equipment} · {x.lanes}</p>
                  </li>
                ))}
              </ul>
            </NCard>
          </section>
        </div>
      </div>
    </main>
  );
}

function toggle(arr: string[], v: string) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${active ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

function MultiSelect({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <ToggleChip key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>{o}</ToggleChip>
        ))}
      </div>
    </div>
  );
}

function NumberField({ value, step, onChange }: { value: number; step: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(n); }}
      className="w-24 rounded-md border border-border bg-background p-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function EditableText({ value, onChange, multiline }: { value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (editing) {
    return (
      <div>
        {multiline ? (
          <textarea value={v} onChange={(e) => setV(e.target.value)} className="w-full min-h-[120px] rounded-md border border-border bg-background p-3 text-sm" />
        ) : (
          <input value={v} onChange={(e) => setV(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-sm" />
        )}
        <div className="mt-2 flex gap-2 justify-end">
          <button onClick={() => { setV(value); setEditing(false); }} className="text-xs text-muted-foreground">Cancel</button>
          <button onClick={() => { onChange(v); setEditing(false); }} className="text-xs inline-flex items-center gap-1 text-foreground"><Check className="h-3 w-3" />Save</button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="group w-full text-left">
      <p className="text-body text-sm">{value}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
        <Pencil className="h-3 w-3" /> Edit
      </span>
    </button>
  );
}