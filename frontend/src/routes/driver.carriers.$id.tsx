import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { companies, type Company } from "@/data/mock";
import { computeMatch } from "@/lib/match";
import { DriverProvider, useDriver } from "@/lib/driver-context";
import { DriverHeader } from "@/components/nocti/DriverHeader";
import { Eyebrow, DisplayHeading, NCard, Chip, PillButton, MatchBadge } from "@/components/nocti/primitives";
import { MatchBreakdown } from "@/components/nocti/MatchBreakdown";
import { ArrowLeft, MapPin, Building2, Shield, ClipboardList, X, DollarSign, Clock } from "lucide-react";

export const Route = createFileRoute("/driver/carriers/$id")({
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
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center space-y-3">
          <p>{error.message}</p>
          <button onClick={() => { router.invalidate(); reset(); }} className="underline">Try again</button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      <div className="text-center space-y-3">
        <p>Carrier not found.</p>
        <Link to="/driver/carriers" className="underline">Back to carriers</Link>
      </div>
    </div>
  ),
  component: () => (
    <DriverProvider>
      <CarrierDetailPage />
    </DriverProvider>
  ),
});

function CarrierDetailPage() {
  const { company } = Route.useLoaderData() as { company: Company };
  const { driver } = useDriver();
  const matchScore = useMemo(() => computeMatch(driver, company).match_score, [driver, company]);
  const [open, setOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background pb-24 overflow-x-hidden">
      <DriverHeader />
      <div className="mx-auto max-w-[1280px] px-8 py-8">
        <Link to="/driver/carriers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All carriers
        </Link>

        {/* Hero */}
        <NCard className="mt-5 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5 min-w-0">
              <img src={company.logo} alt="" className="h-16 w-16 rounded-lg flex-shrink-0" />
              <div className="min-w-0">
                <Eyebrow>{company.dot} · {company.mc}</Eyebrow>
                <DisplayHeading as="h1" className="mt-2 text-3xl md:text-4xl">{company.name}</DisplayHeading>
                <p className="mt-2 text-sm text-muted-foreground">{company.hq} · {company.fleet} trucks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MatchBadge value={matchScore} />
              <PillButton variant="secondary" onClick={() => setOpen(true)}>Message</PillButton>
              <PillButton onClick={() => setOpen(true)}>Apply</PillButton>
            </div>
          </div>
          <p className="mt-6 text-base text-body max-w-3xl">{company.headline}</p>
        </NCard>

        {/* Two-column body */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="space-y-6 min-w-0">
            <NCard className="p-6">
              <Eyebrow>About</Eyebrow>
              <p className="mt-3 text-body text-sm">{company.about}</p>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Pay & benefits</Eyebrow>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat icon={DollarSign} label="Pay" value={company.payRange} />
                <Stat icon={Clock} label="Home time" value={company.homeTime} />
                <Stat icon={Building2} label="Equipment" value={company.equipment.join(", ")} />
              </div>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Benefits</p>
                <div className="flex flex-wrap gap-1.5">
                  {company.benefits.map((b) => <Chip key={b}>{b}</Chip>)}
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Lanes</p>
                <div className="flex flex-wrap gap-1.5">
                  {company.lanes.map((l) => <Chip key={l}>{l}</Chip>)}
                </div>
              </div>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Why this scored {matchScore}</Eyebrow>
              <div className="mt-4">
                <MatchBreakdown driver={driver} company={company} />
              </div>
            </NCard>
          </div>

          <aside className="space-y-6">
            <NCard className="p-6">
              <Eyebrow>FMCSA snapshot</Eyebrow>
              <div className="mt-4 divide-y divide-border">
                {[
                  { label: "Safety rating", value: company.fmcsa.safety, icon: Shield },
                  { label: "Operating authority", value: company.fmcsa.authority, icon: ClipboardList },
                  { label: "Inspections (24 mo)", value: String(company.fmcsa.inspections24mo) },
                  { label: "Out-of-service rate", value: company.fmcsa.oosRate },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </NCard>

            <NCard className="p-6">
              <Eyebrow>Headquarters</Eyebrow>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {company.hq}
              </p>
            </NCard>
          </aside>
        </div>
      </div>

      {open && <ApplyModal company={company.name} onClose={() => setOpen(false)} />}
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
        <Icon className="inline h-3 w-3 mr-1" />{label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function ApplyModal({ company, onClose }: { company: string; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow>Application</Eyebrow>
            <DisplayHeading as="h3" className="mt-2 text-2xl">{sent ? <>Sent.</> : <>Hi <em className="italic">{company}</em>,</>}</DisplayHeading>
          </div>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        {sent ? (
          <p className="mt-4 text-body text-sm">Your profile and message were sent. You'll get a notification when {company} replies.</p>
        ) : (
          <>
            <textarea
              defaultValue={`Hey, I'm interested in driving for you. Happy to chat anytime.`}
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