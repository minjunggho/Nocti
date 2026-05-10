import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow, DisplayHeading, PillButton } from "@/components/nocti/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/company/auth")({
  head: () => ({
    meta: [
      { title: "Recruiter sign in — Nocti" },
      { name: "description", content: "Sign in to manage your trucking company profile on Nocti." },
    ],
  }),
  component: CompanyAuthPage,
});

function CompanyAuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const redirect = `${window.location.origin}/company`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        toast.success("Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/company/drivers" });
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
        <Link to="/" className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          ← Nocti
        </Link>
        <div className="mt-8">
          <Eyebrow>For carriers</Eyebrow>
          <DisplayHeading className="mt-3">
            {mode === "signin" ? "Sign in to your carrier workspace." : "Create your carrier workspace."}
          </DisplayHeading>
          <p className="mt-3 text-muted-foreground">
            Recruit qualified drivers matched to your lanes, pay, and culture.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <div>
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5 h-11" />
          </div>
          <PillButton type="submit" disabled={busy} className="w-full">
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </PillButton>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "New to Nocti? Create a carrier account." : "Already have an account? Sign in."}
        </button>

        <p className="mt-10 text-xs text-muted-foreground text-center">
          Are you a driver?{" "}
          <Link to="/driver/auth" className="underline hover:text-foreground">Driver sign in →</Link>
        </p>
      </div>
    </main>
  );
}