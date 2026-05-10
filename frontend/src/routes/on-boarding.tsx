import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { Eyebrow, DisplayHeading, PillButton, NCard } from "@/components/nocti/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getDriverByEmail,
  sendVerificationEmail,
  updateDriver,
  verifyDriverEmail,
  type ApiDriver,
  type VerificationSession,
} from "@/lib/api";

const search = z.object({ email: z.string().email().optional() }).catch({});

export const Route = createFileRoute("/on-boarding")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Continue your Nocti profile" },
      {
        name: "description",
        content:
          "Confirm the email you shared with Nocti and finish your driver profile.",
      },
    ],
  }),
  component: OnBoarding,
});

type Stage = "verify" | "profile";

type Form = {
  name: string;
  email: string;
  home_city: string;
  home_state: string;
  experience_years: string;
  vehicle_type: string;
  preferred_lane_type: string;
  desired_home_time: string;
  pay_priority: string;
  communication_preference: string;
  burnout_concerns: string;
};

const emptyForm: Form = {
  name: "",
  email: "",
  home_city: "",
  home_state: "",
  experience_years: "",
  vehicle_type: "",
  preferred_lane_type: "",
  desired_home_time: "",
  pay_priority: "",
  communication_preference: "",
  burnout_concerns: "",
};

function fromApi(d: ApiDriver & { email?: string }, fallbackEmail = ""): Form {
  return {
    name: d.name ?? "",
    email: (d as { email?: string }).email ?? fallbackEmail,
    home_city: d.home_city ?? "",
    home_state: d.home_state ?? "",
    experience_years: d.experience_years != null ? String(d.experience_years) : "",
    vehicle_type: d.vehicle_type ?? "",
    preferred_lane_type: d.preferred_lane_type ?? "",
    desired_home_time: d.desired_home_time ?? "",
    pay_priority: d.pay_priority ?? "",
    communication_preference: d.communication_preference ?? "",
    burnout_concerns: d.burnout_concerns ?? "",
  };
}

function OnBoarding() {
  const { email: emailParam } = Route.useSearch();
  const navigate = useNavigate();

  const [stage, setStage] = React.useState<Stage>("verify");
  const [email, setEmail] = React.useState(emailParam ?? "");
  const [driver, setDriver] = React.useState<ApiDriver | null>(null);
  const [name, setName] = React.useState<string | null>(null);

  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const [digits, setDigits] = React.useState(["", "", "", "", "", ""]);
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);

  const [resending, setResending] = React.useState(false);
  const [resendNote, setResendNote] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<Form>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [verifiedNote, setVerifiedNote] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwError, setPwError] = React.useState<string | null>(null);

  const lookup = React.useCallback(async (addr: string) => {
    setLookupLoading(true);
    setLookupError(null);
    setNotFound(false);
    try {
      const r = (await getDriverByEmail(addr)) as
        | ApiDriver
        | VerificationSession;
      let d: ApiDriver | null = null;
      let n: string | null = null;
      if (r && (r as ApiDriver).id) {
        d = r as ApiDriver;
      } else if (r && (r as VerificationSession).driver) {
        d = (r as VerificationSession).driver ?? null;
        n = (r as VerificationSession).name ?? null;
      }
      if (!d) {
        setNotFound(true);
      }
      setDriver(d);
      setName(d?.name ?? n ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed";
      if (/404|not found/i.test(msg)) {
        setNotFound(true);
      } else {
        setLookupError("We couldn’t reach the server. Please try again.");
      }
    } finally {
      setLookupLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
      lookup(emailParam);
    }
  }, [emailParam, lookup]);

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const code = digits.join("");
  const canSubmit = !!email && code.length === 6 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setVerifyError(null);
    try {
      const res = await verifyDriverEmail(email, code);
      if (!res?.success) throw new Error("invalid");
      const d = res.driver;
      setDriver(d);
      setName(d.name ?? name);
      setForm(fromApi(d, email));
      setVerifiedNote("Email confirmed. Let's finish your driver profile.");
      setStage("profile");
    } catch {
      setVerifyError("That code doesn’t look right. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email || resending) return;
    setResending(true);
    setResendNote(null);
    try {
      await sendVerificationEmail(email);
      setResendNote("New code sent. Check your inbox.");
    } catch {
      setResendNote("Couldn’t resend right now. Please try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  const setF = <K extends keyof Form>(k: K) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!driver) return;
    if (!password) {
      setPwError("Please create a password to continue.");
      return;
    }
    if (password.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwError(null);
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        name: form.name,
        email: form.email,
        email_confirmed: true,
        database_consent: true,
        experience_years: form.experience_years
          ? Number(form.experience_years)
          : null,
        vehicle_type: form.vehicle_type || null,
        home_city: form.home_city || null,
        home_state: form.home_state
          ? form.home_state.toUpperCase().slice(0, 2)
          : null,
        preferred_lane_type: form.preferred_lane_type || null,
        desired_home_time: form.desired_home_time || null,
        pay_priority: form.pay_priority || null,
        communication_preference: form.communication_preference || null,
        burnout_concerns: form.burnout_concerns || null,
        password,
      } as Partial<ApiDriver> & { password: string };
      const updated = await updateDriver(driver.id, body);
      const saved = (updated ?? driver) as ApiDriver & {
        email?: string;
        email_confirmed?: boolean;
        database_consent?: boolean;
      };
      try {
        localStorage.setItem(
          "nocti_current_driver",
          JSON.stringify({
            driver_id: saved.id ?? driver.id,
            name: saved.name ?? form.name,
            email: saved.email ?? form.email,
            email_confirmed: saved.email_confirmed ?? true,
            database_consent: saved.database_consent ?? true,
          }),
        );
        localStorage.removeItem("nocti-driver");
      } catch {}
      navigate({ to: "/driver" });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (stage === "profile") {
    return (
      <div className="min-h-screen px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <Eyebrow>Almost there</Eyebrow>
            <DisplayHeading as="h2" className="mt-5">
              Finish your <em className="italic">driver profile</em>.
            </DisplayHeading>
            <p className="mt-4 text-muted-foreground">
              We pre-filled what you shared on the call. Edit anything that’s
              off, fill in the rest.
            </p>
          </div>

          <NCard className="mt-8 p-6 space-y-5">
            {verifiedNote && (
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
                {verifiedNote}
              </div>
            )}
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => setF("name")(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input value={form.email} readOnly className="bg-muted/30" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Home city">
                <Input
                  value={form.home_city}
                  onChange={(e) => setF("home_city")(e.target.value)}
                />
              </Field>
              <Field label="Home state">
                <Input
                  value={form.home_state}
                  onChange={(e) =>
                    setF("home_state")(
                      e.target.value
                        .replace(/[^a-zA-Z]/g, "")
                        .toUpperCase()
                        .slice(0, 2),
                    )
                  }
                  maxLength={2}
                  placeholder="CA"
                />
              </Field>
              <Field label="Years of driving experience">
                <Input
                  type="number"
                  value={form.experience_years}
                  onChange={(e) => setF("experience_years")(e.target.value)}
                />
              </Field>
              <Field label="Equipment experience">
                <Input
                  placeholder="dry van, reefer…"
                  value={form.vehicle_type}
                  onChange={(e) => setF("vehicle_type")(e.target.value)}
                />
              </Field>
              <Field label="Preferred lane type">
                <Input
                  placeholder="regional, OTR, local"
                  value={form.preferred_lane_type}
                  onChange={(e) => setF("preferred_lane_type")(e.target.value)}
                />
              </Field>
              <Field label="Desired home time">
                <Input
                  placeholder="weekly, daily…"
                  value={form.desired_home_time}
                  onChange={(e) => setF("desired_home_time")(e.target.value)}
                />
              </Field>
              <Field label="Pay priority">
                <Input
                  placeholder="home time, top dollar…"
                  value={form.pay_priority}
                  onChange={(e) => setF("pay_priority")(e.target.value)}
                />
              </Field>
              <Field label="Dispatcher / communication preference">
                <Input
                  value={form.communication_preference}
                  onChange={(e) =>
                    setF("communication_preference")(e.target.value)
                  }
                />
              </Field>
            </div>
            <Field label="Current job dislikes or burnout concerns">
              <Textarea
                rows={3}
                value={form.burnout_concerns}
                onChange={(e) => setF("burnout_concerns")(e.target.value)}
              />
            </Field>

            <div className="pt-2 border-t border-border" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Create password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Confirm password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              You’ll use this password to log back into your NOCTI driver profile.
            </p>

            {pwError && <p className="text-sm text-destructive">{pwError}</p>}

            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}

            <PillButton
              onClick={save}
              disabled={saving}
              className="w-full"
            >
              {saving ? "Saving…" : "Create account and see my matches"}
            </PillButton>
          </NCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">
        <div className="text-center">
          <Eyebrow>Nocti</Eyebrow>
          <DisplayHeading as="h2" className="mt-5">
            {name ? (
              <>
                Welcome back,{" "}
                <em className="italic">{name.split(" ")[0]}</em>.
              </>
            ) : (
              <>
                Welcome <em className="italic">back</em>.
              </>
            )}
          </DisplayHeading>
          <p className="mt-4 text-muted-foreground">
            You spoke with NOCTI earlier. Enter the code we sent to confirm
            your profile.
          </p>
        </div>

        <NCard className="mt-8 p-6 space-y-5">
          {!emailParam && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <PillButton
                  variant="secondary"
                  onClick={() => email && lookup(email)}
                  disabled={!email || lookupLoading}
                  className="px-4 py-2 text-xs"
                >
                  {lookupLoading ? "…" : "Find me"}
                </PillButton>
              </div>
              {!email && (
                <p className="text-xs text-muted-foreground">
                  Use the same email you shared on the call.
                </p>
              )}
            </div>
          )}

          {emailParam && (
            <div className="text-sm text-muted-foreground">
              {lookupLoading ? (
                "Looking up your profile…"
              ) : (
                <>
                  Code sent to{" "}
                  <span className="text-foreground">{emailParam}</span>
                </>
              )}
            </div>
          )}

          {notFound && (
            <p className="text-sm text-destructive">
              We couldn’t find a driver with that email. Double-check the
              address or call NOCTI again.
            </p>
          )}
          {lookupError && (
            <p className="text-sm text-destructive">{lookupError}</p>
          )}

          <div className="space-y-2">
            <Label>Verification code</Label>
            <div className="flex justify-between gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onPaste={onPaste}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0)
                      refs.current[i - 1]?.focus();
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  className="h-14 w-11 rounded-md border border-border bg-card text-center text-xl font-serif focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ))}
            </div>
          </div>

          {verifyError && (
            <p className="text-sm text-destructive">{verifyError}</p>
          )}

          <PillButton
            onClick={submit}
            disabled={!canSubmit}
            className="w-full"
          >
            {submitting ? "Confirming…" : "Confirm and continue"}
          </PillButton>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Didn’t get the email?</span>
            <button
              type="button"
              onClick={resend}
              disabled={!email || resending}
              className="underline underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              {resending ? "Resending…" : "Resend code"}
            </button>
          </div>
          {resendNote && (
            <p className="text-xs text-muted-foreground">{resendNote}</p>
          )}
        </NCard>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Trouble confirming? Email{" "}
          <a
            className="underline underline-offset-4"
            href="mailto:hello@nocti.app"
          >
            hello@nocti.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}