import { createFileRoute, Link } from "@tanstack/react-router";
import { Eyebrow, DisplayHeading, NCard } from "@/components/nocti/primitives";
import { Building2, Search, ShieldCheck, HeartPulse, TrendingDown, ArrowRight, Check } from "lucide-react";
import { WebShell, WebSection, WebContainer, WebFooter } from "@/components/nocti/WebShell";

export const Route = createFileRoute("/for-carriers")({
  head: () => ({
    meta: [
      { title: "For carriers — Hire drivers who stay" },
      { name: "description", content: "Nocti helps you recruit and retain — by giving every driver in your fleet a personal AI assistant." },
      { property: "og:title", content: "For carriers — Nocti" },
      { property: "og:description", content: "Smarter recruiting and built-in retention for trucking fleets." },
    ],
  }),
  component: ForCarriers,
});

const FEATURES = [
  { icon: Search, title: "Smarter recruiting", body: "Match drivers by lane, pay, equipment, and home time. FMCSA autofill, no copy-paste." },
  { icon: ShieldCheck, title: "Retention built in", body: "Every driver you hire gets Nocti as a 24/7 personal assistant." },
  { icon: HeartPulse, title: "Know how your fleet feels", body: "Nocti surfaces driver sentiment and concerns so you can act before they leave." },
  { icon: TrendingDown, title: "Less turnover, lower cost", body: "Replacing a driver costs $8K–$12K. Keeping them costs less." },
];

function ForCarriers() {
  return (
    <WebShell
      navItems={[
        { label: "How it works", to: "/" },
        { label: "For drivers", to: "/for-drivers" },
        { label: "For carriers", to: "/for-carriers" },
      ]}
      rightSlot={<Link to="/company/auth" className="text-sm text-foreground hover:opacity-70">Sign in</Link>}
    >
      <WebSection className="pt-12 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>For carriers</Eyebrow>
          <DisplayHeading className="mt-5 text-5xl md:text-6xl leading-[1.04]">
            Hire drivers who <em className="italic">stay</em>. Keep the ones you have.
          </DisplayHeading>
          <p className="mt-6 text-lg md:text-xl text-body max-w-2xl">
            Nocti helps you recruit and retain — by giving every driver in your fleet a
            personal AI assistant.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <NCard key={f.title} className="p-6 md:p-7">
              <f.icon className="h-6 w-6" style={{ color: "var(--accent)" }} />
              <h3 className="mt-4 font-serif text-xl md:text-2xl">{f.title}</h3>
              <p className="mt-2 text-base text-body">{f.body}</p>
            </NCard>
          ))}
        </div>
      </WebSection>

      <WebSection bleed className="bg-muted/40 border-y border-border">
        <WebContainer>
          <div className="max-w-2xl mx-auto">
            <Link to="/company/auth" className="block text-left group">
              <NCard className="p-7 md:p-9 transition-colors group-hover:bg-background group-hover:border-foreground/30">
                <Building2 className="h-7 w-7" />
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">I'm a carrier</p>
                <h3 className="mt-2 font-serif text-2xl md:text-3xl leading-tight">Find drivers who'll stay.</h3>
                <ul className="mt-5 space-y-2.5 text-base text-body">
                  {["FMCSA autofill — no DOT copy-pasting","AI reads your site to write your About and Culture","Match drivers by lane, pay, equipment, home time"].map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 mt-1 shrink-0" style={{ color: "var(--accent)" }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background min-h-[44px]">
                  I'm a carrier <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </NCard>
            </Link>
          </div>
        </WebContainer>
      </WebSection>

      <WebFooter />
    </WebShell>
  );
}
