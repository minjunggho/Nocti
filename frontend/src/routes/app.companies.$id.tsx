import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Eyebrow, DisplayHeading, NCard, MatchBadge, PillButton, Chip } from "@/components/nocti/primitives";
import { companies, type Company } from "@/data/mock";
import { ArrowLeft, MapPin, Building2, Shield, ClipboardList, X } from "lucide-react";
import { MatchBreakdown } from "@/components/nocti/MatchBreakdown";
import { computeMatch } from "@/lib/match";
import { useDriver } from "@/lib/driver-context";

export const Route = createFileRoute("/app/companies/$id")({
  head: ({ params }) => {
    const c = companies.find((c) => c.id === params.id);
    return {
      meta: [
        { title: c ? `${c.name} — Nocti` : "Carrier — Nocti" },
        { name: "description", content: c?.headline ?? "Carrier details on Nocti." },
      ],
    };
  },
  loader: ({ params }) => {
    const company = companies.find((c) => c.id === params.id);
    if (!company) throw notFound();
    return { company };
  },
  component: CompanyDetail,
});

function CompanyDetail() {
  const { company } = Route.useLoaderData() as { company: Company };
  const { driver } = useDriver();
  const matchScore = useMemo(() => computeMatch(driver, company).match_score, [driver, company]);
  const [open, setOpen] = useState(false);

  return (
    <div className="pb-32">
      <div className="px-5 pt-6">
        <Link to="/app/companies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All carriers
        </Link>
      </div>

      <header className="px-5 pt-6">
        <div className="flex items-start gap-4">
          <img src={company.logo} alt="" className="h-16 w-16 rounded-lg" />
          <div className="flex-1 min-w-0">
            <Eyebrow>{company.dot} · {company.mc}</Eyebrow>
            <DisplayHeading as="h2" className="mt-2">{company.name}</DisplayHeading>
            <div className="mt-3"><MatchBadge value={matchScore} /></div>
          </div>
        </div>
        <p className="mt-5 text-base text-body">{company.headline}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="text-muted-foreground"><Building2 className="inline h-4 w-4 mr-1.5" />{company.fleet} trucks</div>
          <div className="text-muted-foreground"><MapPin className="inline h-4 w-4 mr-1.5" />{company.hq}</div>
        </div>
      </header>

      <section className="mt-10 px-5">
        <Eyebrow>About</Eyebrow>
        <p className="mt-3 text-body">{company.about}</p>
      </section>

      <section className="mt-10 px-5">
        <Eyebrow>FMCSA snapshot</Eyebrow>
        <DisplayHeading as="h3" className="mt-3">Public <em className="italic">safety record</em>.</DisplayHeading>
        <NCard className="mt-5 divide-y divide-border">
          {[
            { label: "Safety rating", value: company.fmcsa.safety, icon: Shield },
            { label: "Operating authority", value: company.fmcsa.authority, icon: ClipboardList },
            { label: "Inspections (24 mo)", value: String(company.fmcsa.inspections24mo) },
            { label: "Out-of-service rate", value: company.fmcsa.oosRate },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm text-foreground">{row.value}</span>
            </div>
          ))}
        </NCard>
      </section>

      <section className="mt-10 px-5">
        <Eyebrow>Lanes they run</Eyebrow>
        <NCard className="mt-5 p-4">
          <USMap />
          <div className="mt-4 flex flex-wrap gap-2">
            {company.lanes.map((l: string) => <Chip key={l}>{l}</Chip>)}
          </div>
        </NCard>
      </section>

      <section className="mt-10 px-5">
        <Eyebrow>Pay & benefits</Eyebrow>
        <NCard className="mt-5 divide-y divide-border">
          <Row label="Pay" value={company.payRange} />
          <Row label="Home time" value={company.homeTime} />
          <Row label="Equipment" value={company.equipment.join(", ")} />
          <div className="px-4 py-4">
            <p className="text-sm text-muted-foreground mb-2">Benefits</p>
            <div className="flex flex-wrap gap-1.5">
              {company.benefits.map((b: string) => <Chip key={b}>{b}</Chip>)}
            </div>
          </div>
        </NCard>
      </section>

      <section className="mt-10 px-5">
        <MatchBreakdown driver={driver} company={company} />
      </section>

      <div className="fixed bottom-[72px] inset-x-0 z-30 px-5 pb-3 pt-3 bg-background/95 backdrop-blur border-t border-border">
        <div className="mx-auto max-w-2xl flex gap-2">
          <PillButton variant="secondary" className="flex-1" onClick={() => setOpen(true)}>Message</PillButton>
          <PillButton className="flex-1" onClick={() => setOpen(true)}>Apply</PillButton>
        </div>
      </div>

      {open && <ApplyModal company={company.name} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}

function ApplyModal({ company, onClose }: { company: string; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow>Application</Eyebrow>
            <DisplayHeading as="h3" className="mt-2">{sent ? <>Sent.</> : <>Hi <em className="italic">{company}</em>,</>}</DisplayHeading>
          </div>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        {sent ? (
          <p className="mt-4 text-body text-sm">Your profile and message were sent. You'll get a notification when {company} replies.</p>
        ) : (
          <>
            <textarea
              defaultValue={`Hey, I'm interested in driving for you. I have 12 years OTR, CDL-A with Hazmat and TWIC, and I'm based in Knoxville. Happy to chat anytime.`}
              className="mt-4 w-full h-32 rounded-md border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <PillButton variant="secondary" onClick={onClose}>Cancel</PillButton>
              <PillButton onClick={() => setSent(true)}>Send application</PillButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function USMap() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-auto">
      <rect width="400" height="220" fill="var(--accent-soft)" rx="6" />
      <path d="M40,140 C90,40 200,40 360,80 L360,180 C260,200 120,200 40,180 Z" fill="white" stroke="var(--border)" strokeWidth="1" />
      <circle cx="180" cy="120" r="4" fill="var(--foreground)" />
      <text x="188" y="124" fontSize="10" fill="var(--foreground)">Home</text>
      <line x1="180" y1="120" x2="280" y2="90" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="180" y1="120" x2="100" y2="160" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="180" y1="120" x2="240" y2="170" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="280" cy="90" r="3" fill="var(--accent)" />
      <circle cx="100" cy="160" r="3" fill="var(--accent)" />
      <circle cx="240" cy="170" r="3" fill="var(--accent)" />
    </svg>
  );
}
