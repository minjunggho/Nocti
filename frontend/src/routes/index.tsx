import { createFileRoute, Link } from "@tanstack/react-router";
import { Eyebrow, DisplayHeading, PillButton, NCard } from "@/components/nocti/primitives";
import { Truck, Building2, MapPin, ArrowRight, Check } from "lucide-react";
import { WebShell, WebSection, WebContainer, WebFooter } from "@/components/nocti/WebShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nocti — Helping you make your perfect match" },
      {
        name: "description",
        content:
          "Nocti is the matching layer for trucking. Real matching, real retention, no recruiter games.",
      },
      { property: "og:title", content: "Nocti — Helping you make your perfect match" },
      {
        property: "og:description",
        content: "The matching layer for trucking. Drivers and carriers, finally on the same page.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <WebShell
      navItems={[
        { label: "How it works", to: "/" },
        { label: "For drivers", to: "/for-drivers" },
        { label: "For carriers", to: "/for-carriers" },
      ]}
      rightSlot={<Link to="/driver/auth" className="text-sm text-foreground hover:opacity-70">Sign in</Link>}
    >
      {/* HERO + PATHS — merged */}
      <WebSection className="pt-12 md:pt-20">
        <div className="max-w-4xl">
          <Eyebrow>For drivers · For carriers</Eyebrow>
          <DisplayHeading className="mt-5 text-5xl md:text-6xl xl:text-7xl leading-[1.02]">
            Helping you make your <em className="italic">perfect match</em> — and <em className="italic">keep it</em>.
          </DisplayHeading>
          <p className="mt-6 text-lg md:text-xl text-body max-w-2xl">
            Nocti is where drivers and carriers meet on the same terms — and stay together.
            Real matching, real retention, no recruiter games.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          <PathCard
            to="/driver/auth"
            icon={Truck}
            eyebrow="I'm a driver"
            title="Find a carrier that fits."
            bullets={[
              "Set your lanes, pay, and home time",
              "See exactly why a carrier scored 92 vs 61",
              "Your contact stays private until you say go",
            ]}
            cta="I'm a driver"
          />
          <PathCard
            to="/company/auth"
            icon={Building2}
            eyebrow="I'm a carrier"
            title="Find drivers who'll stay."
            bullets={[
              "FMCSA autofill — no DOT copy-pasting",
              "AI reads your site to write your About and Culture",
              "Match drivers by lane, pay, equipment, home time",
            ]}
            cta="I'm a carrier"
          />
        </div>
      </WebSection>

      {/* MATCH SCORECARD — standalone */}
      <WebSection bleed className="bg-muted/40 border-y border-border">
        <WebContainer>
          <div className="text-center">
            <Eyebrow>What a match looks like</Eyebrow>
          </div>
          <div className="mt-10 max-w-xl mx-auto">
            <HeroPreview />
          </div>
        </WebContainer>
      </WebSection>

      {/* HOW IT WORKS */}
      <WebSection>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <Eyebrow>How it works</Eyebrow>
            <DisplayHeading as="h2" className="mt-3 text-3xl md:text-4xl">
              One profile. <em className="italic">Both sides see the math.</em>
            </DisplayHeading>
            <p className="mt-5 text-base text-body">
              Every score comes with a factor breakdown, so both sides know why they fit.
            </p>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            <Step n="01" title="Tell us what you want" body="Drivers set lanes, pay, home time. Carriers pull FMCSA data and define their ideal driver." />
            <Step n="02" title="See the match score" body="Every pairing gets a 0–100 score with a factor breakdown." />
            <Step n="03" title="Connect when it fits" body="No mass blasts. Talk only when both sides actually align." />
          </div>
        </div>
      </WebSection>

      {/* CTA */}
      <WebSection bleed className="bg-muted/40 border-y border-border">
        <WebContainer>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <DisplayHeading as="h2" className="text-3xl md:text-5xl">
                Stop guessing. <em className="italic">Start matching.</em>
              </DisplayHeading>
            </div>
            <div className="lg:col-span-4 flex flex-wrap gap-3 lg:justify-end">
              <Link to="/driver/auth"><PillButton>I'm a driver</PillButton></Link>
              <Link to="/company/auth"><PillButton>I'm a carrier</PillButton></Link>
            </div>
          </div>
        </WebContainer>
      </WebSection>

      <WebFooter />
    </WebShell>
  );
}

function PathCard({
  to,
  icon: Icon,
  eyebrow,
  title,
  bullets,
  cta,
}: {
  to: "/driver/auth" | "/company/auth";
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  bullets: string[];
  cta: string;
}) {
  return (
    <Link to={to} className="block text-left group">
      <NCard className="p-7 md:p-9 h-full flex flex-col transition-colors group-hover:bg-background group-hover:border-foreground/30">
        <Icon className="h-7 w-7" />
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        <h3 className="mt-2 font-serif text-2xl md:text-3xl leading-tight">{title}</h3>
        <ul className="mt-5 space-y-2.5 text-base text-body flex-1">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <Check className="h-4 w-4 mt-1 shrink-0" style={{ color: "var(--accent)" }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <span className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors group-hover:bg-foreground/90 min-h-[44px]">
          {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </NCard>
    </Link>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <NCard className="p-6 md:p-7">
      <span className="font-serif italic text-2xl text-muted-foreground">{n}</span>
      <h3 className="mt-3 font-serif text-xl">{title}</h3>
      <p className="mt-2 text-base text-body">{body}</p>
    </NCard>
  );
}

function HeroPreview() {
  return (
    <NCard className="p-6 md:p-7 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Match scorecard</p>
          <p className="mt-1 font-serif text-xl">
            Marcus Reed × <em className="italic">Ridgeline Carriers</em>
          </p>
        </div>
        <div
          className="h-14 w-14 rounded-full flex flex-col items-center justify-center text-background shrink-0"
          style={{ backgroundColor: "var(--success)" }}
        >
          <span className="text-base font-semibold leading-none">92</span>
          <span className="text-[9px] uppercase tracking-wider opacity-90 mt-0.5">match</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <PreviewRow label="Lanes" value="TN ↔ TX, SE regional" weight={28} />
        <PreviewRow label="Pay range" value="$0.72–0.78 / mi" weight={22} />
        <PreviewRow label="Home time" value="Home weekly" weight={18} />
        <PreviewRow label="Equipment" value="Dry van" weight={14} />
        <PreviewRow label="Experience" value="12 yrs · clean record" weight={10} />
        <PreviewRow label="Distance" value="112 mi from home base" weight={8} />
      </div>

      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Why this is a 92</span>
        <span className="inline-flex items-center gap-1 text-foreground">
          <Check className="h-3.5 w-3.5" /> 6 of 6 factors aligned
        </span>
      </div>
    </NCard>
  );
}

function PreviewRow({ label, value, weight }: { label: string; value: string; weight: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="flex-1 text-foreground truncate">{value}</span>
      <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
        <span className="font-mono">+{weight}</span>
      </span>
    </div>
  );
}
