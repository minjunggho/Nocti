import { cn } from "@/lib/utils";
import * as React from "react";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function DisplayHeading({
  children,
  className,
  as: As = "h1",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <As
      className={cn(
        "font-serif text-foreground tracking-tight",
        As === "h1" && "text-4xl sm:text-5xl leading-[1.05]",
        As === "h2" && "text-3xl sm:text-4xl leading-[1.1]",
        As === "h3" && "text-2xl leading-tight",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function PillButton({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-colors min-h-[44px]",
        variant === "primary" && "bg-foreground text-background hover:bg-foreground/90",
        variant === "secondary" && "bg-background text-foreground border border-border hover:bg-muted",
        variant === "ghost" && "bg-transparent text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function NCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card border border-border rounded-lg", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function MatchBadge({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
      {value}% match
    </span>
  );
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-foreground", className)}>
      {children}
    </span>
  );
}