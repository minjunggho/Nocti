import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Eyebrow, DisplayHeading, PillButton } from "@/components/nocti/primitives";
import { currentDriver } from "@/data/mock";

export const Route = createFileRoute("/verify")({
  head: () => ({ meta: [{ title: "Verify — Nocti" }, { name: "description", content: "Enter the 6-digit code we texted you." }] }),
  component: Verify,
});

function Verify() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = c; setDigits(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) setTimeout(() => navigate({ to: "/app" }), 250);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Eyebrow>One-time code</Eyebrow>
        <DisplayHeading as="h2" className="mt-5">
          Enter the <em className="italic">6-digit code</em> we texted to {currentDriver.phone}.
        </DisplayHeading>
        <div className="mt-8 flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i-1]?.focus(); }}
              inputMode="numeric"
              maxLength={1}
              className="h-14 w-11 rounded-md border border-border bg-card text-center text-xl font-serif focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center gap-3">
          <PillButton onClick={() => navigate({ to: "/app" })}>Continue</PillButton>
          <button className="text-sm text-muted-foreground hover:text-foreground">Resend code</button>
        </div>
      </div>
    </div>
  );
}
