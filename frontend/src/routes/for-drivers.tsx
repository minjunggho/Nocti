import { createFileRoute, Link } from "@tanstack/react-router";
import { Eyebrow, DisplayHeading, PillButton, NCard } from "@/components/nocti/primitives";
import { Truck, TrendingUp, MessageCircle, Brain, Target, ArrowRight, Check } from "lucide-react";
import { WebShell, WebSection, WebContainer, WebFooter } from "@/components/nocti/WebShell";

export const Route = createFileRoute("/for-drivers")({
  head: () => ({
    meta: [
      { title: "For drivers — Nocti, your AI co-pilot for the road" },
      { name: "description", content: "Nocti is a personal AI assistant for truck drivers — built for the way you actually work." },
      { property: "og:title", content: "For drivers — Nocti" },
      { property: "og:description", content: "Your AI co-pilot for the road. Live market intel, real matching, and an assistant that remembers you." },
    ],
  }),
  component: ForDrivers,
});

const FEATURES = [
  { icon: TrendingUp, title: "Market intelligence", body: "Live updates on rates, lanes, and demand, so you know your worth before any conversation." },
  { icon: MessageCircle, title: "Talk to it like a person", body: "No menus, no forms. Just tell Nocti what you want." },
  { icon: Brain, title: "It remembers you", body: "Every conversation builds on the last. Your preferences, history, and goals stay with you." },
  { icon: Target, title: "Match with carriers that fit", body: "Lanes, pay, home time, equipment. The math is shown." },
];

function ForDrivers() {
  return (
    <WebShell
      navItems={[
        { label: "How it works", to: "/" },
        { label: "For drivers", to: "/for-drivers" },
        { label: "For carriers", to: "/for-carriers" },
      ]}
      rightSlot={<Link to="/driver/auth" className="text-sm text-foreground hover:opacity-70">Sign in</Link>}
    >
      <WebSection className="pt-12 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>For drivers</Eyebrow>
          <DisplayHeading className="mt-5 text-5xl md:text-6xl leading-[1.04]">
            Your AI <em className="italic">co-pilot</em> for the road.
          </DisplayHeading>
          <p className="mt-6 text-lg md:text-xl text-body max-w-2xl">
            Nocti isn't just a job board. It's a personal AI assistant for truck drivers —
            built for the way you actually work.
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
            <Link to="/driver/auth" className="block text-left group">
              <NCard className="p-7 md:p-9 transition-colors group-hover:bg-background group-hover:border-foreground/30">
                <Truck className="h-7 w-7" />
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">I'm a driver</p>
                <h3 className="mt-2 font-serif text-2xl md:text-3xl leading-tight">Find a carrier that fits.</h3>
                <ul className="mt-5 space-y-2.5 text-base text-body">
                  {["Set your lanes, pay, and home time","See exactly why a carrier scored 92 vs 61","Your contact stays private until you say go"].map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 mt-1 shrink-0" style={{ color: "var(--accent)" }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background min-h-[44px]">
                  I'm a driver <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
