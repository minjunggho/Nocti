import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eyebrow, DisplayHeading, NCard, Chip, PillButton } from "@/components/nocti/primitives";
import { Pencil, Check, FileText, ShieldCheck } from "lucide-react";
import { useDriver } from "@/lib/driver-context";
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

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — Nocti" }, { name: "description", content: "Your driver profile, lanes, and preferences." }] }),
  component: Profile,
});

function Profile() {
  const { driver: d, setDriver } = useDriver();
  const setD = setDriver;

  return (
    <div className="px-5 pt-8 pb-12 space-y-10">
      <header>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center font-serif text-2xl">
            {d.firstName[0]}{d.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <Eyebrow>Driver profile</Eyebrow>
            <DisplayHeading as="h2" className="mt-1">{d.firstName} {d.lastName}</DisplayHeading>
            <p className="text-sm text-muted-foreground mt-1">{d.yearsExp} years driving · {d.homeBase}</p>
          </div>
        </div>
      </header>

      <Section title="About">
        <EditableText value={d.about} onChange={(v) => setD({ ...d, about: v })} multiline />
      </Section>

      <Section title="Endorsements">
        <div className="flex flex-wrap gap-1.5">
          {d.endorsements.map((e) => (
            <Chip key={e} className="bg-[var(--accent-soft)] border-transparent" >
              <ShieldCheck className="h-3 w-3 mr-1 inline" style={{ color: "var(--accent)" }} />{e}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Experience">
        <ul className="divide-y divide-border">
          {d.experience.map((x, i) => (
            <li key={i} className="py-4 first:pt-0 last:pb-0">
              <p className="font-serif text-base">{x.company}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{x.tenure}</p>
              <p className="text-sm text-body mt-1.5">{x.equipment} · {x.lanes}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Preferences">
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          Changes here re-rank your <em className="italic">Best match</em> list instantly.
        </p>
        <div className="space-y-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Desired pay ($/mi)</p>
            <div className="flex items-center gap-2">
              <NumberField
                value={d.desiredPayMin}
                step={0.01}
                onChange={(v) => setD({ ...d, desiredPayMin: v, preferences: { ...d.preferences, payPerMile: `${v.toFixed(2)} – ${d.desiredPayMax.toFixed(2)}` } })}
              />
              <span className="text-muted-foreground">–</span>
              <NumberField
                value={d.desiredPayMax}
                step={0.01}
                onChange={(v) => setD({ ...d, desiredPayMax: v, preferences: { ...d.preferences, payPerMile: `${d.desiredPayMin.toFixed(2)} – ${v.toFixed(2)}` } })}
              />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Home time</p>
            <div className="flex flex-wrap gap-1.5">
              {HOME_TIME_OPTIONS.map((o) => (
                <ToggleChip
                  key={o.id}
                  active={d.desiredHomeTime === o.id}
                  onClick={() => setD({ ...d, desiredHomeTime: o.id, preferences: { ...d.preferences, homeTime: o.label } })}
                >{o.label}</ToggleChip>
              ))}
            </div>
          </div>

          <MultiSelect
            label="Preferred lanes"
            options={LANE_OPTIONS}
            selected={d.preferences.preferredLanes}
            onToggle={(v) => setD({ ...d, preferences: { ...d.preferences, preferredLanes: toggle(d.preferences.preferredLanes, v) } })}
          />

          <MultiSelect
            label="Won't run"
            options={LANE_OPTIONS}
            selected={d.preferences.avoidLanes}
            onToggle={(v) => setD({ ...d, preferences: { ...d.preferences, avoidLanes: toggle(d.preferences.avoidLanes, v) } })}
          />

          <MultiSelect
            label="Equipment"
            options={EQUIP_OPTIONS}
            selected={d.preferences.equipment}
            onToggle={(v) => setD({ ...d, preferences: { ...d.preferences, equipment: toggle(d.preferences.equipment, v) } })}
          />
        </div>
      </Section>

      <Section title="Benefits wanted">
        <div className="flex flex-wrap gap-1.5">
          {BENEFIT_OPTIONS.map((b) => (
            <ToggleChip
              key={b}
              active={d.benefitsWanted.includes(b)}
              onClick={() => setD({ ...d, benefitsWanted: toggle(d.benefitsWanted, b) })}
            >{b}</ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Documents">
        <div className="space-y-2">
          {d.documents.map((doc) => (
            <NCard key={doc.name} className="p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-foreground">{doc.name}</p>
              </div>
              <span className={`text-xs ${doc.status === "Verified" ? "text-[var(--success)]" : "text-muted-foreground"}`}>
                {doc.status}
              </span>
            </NCard>
          ))}
          <PillButton variant="secondary" className="w-full">Upload document</PillButton>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card border-border text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function MultiSelect({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
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
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
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
          <textarea value={v} onChange={(e) => setV(e.target.value)} className="w-full min-h-[100px] rounded-md border border-border bg-background p-3 text-sm" />
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
      <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
        <Pencil className="h-3 w-3" /> Edit
      </span>
    </button>
  );
}
