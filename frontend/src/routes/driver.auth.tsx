import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow, DisplayHeading, PillButton } from "@/components/nocti/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/driver/auth")({
  head: () => ({
    meta: [
      { title: "Driver sign in — Nocti" },
      { name: "description", content: "Create your driver account on Nocti and start matching with carriers that fit." },
    ],
  }),
  component: DriverAuthPage,
});

function DriverAuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in, jump straight in.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) nav({ to: "/driver" });
    });
    return () => {
      active = false;
    };
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const redirect = `${window.location.origin}/driver`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        if (data.session) {
          nav({ to: "/driver" });
        } else {
          toast.success("Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/driver" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Nocti
        </Link>
        <div className="mt-8">
          <Eyebrow>For drivers</Eyebrow>
          <DisplayHeading className="mt-3">
            {mode === "signin" ? "Welcome back, driver." : "Find your perfect carrier."}
          </DisplayHeading>
          <p className="mt-3 text-muted-foreground">
            Set your lanes, pay, and home time once — we'll show you the carriers that actually fit.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-11" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5 h-11" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>
          <PillButton type="submit" disabled={busy} className="w-full">
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create driver account"}
          </PillButton>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "New here? Create an account." : "Already have an account? Sign in."}
          </button>
          <Link to="/company/auth" className="text-muted-foreground hover:text-foreground">
            I'm a carrier →
          </Link>
        </div>

        <p className="mt-10 text-xs text-muted-foreground text-center">
          Want to look around first?{" "}
          <Link to="/app" className="underline hover:text-foreground">Explore the demo</Link>
        </p>
      </div>
    </main>
  );
}