import * as React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MessageSquare, Menu, X } from "lucide-react";
import { TalkToNoctiSheet } from "./TalkToNoctiSheet";

/**
 * Site-wide container width / padding tokens.
 * Intentionally wider than max-w-6xl (1152) — most modern marketing/dashboard
 * sites sit between 1200-1280 to avoid the "centered single column on a sea
 * of whitespace" feeling on 1440+ displays.
 */
export const SHELL_WIDTH = "max-w-[1240px]";
export const SHELL_PAD = "px-6 md:px-8 xl:px-12";

export type NavItem = { label: string; to: string };

export function WebShell({
  children,
  navItems = [],
  rightSlot,
  showTalkToNocti = true,
  brandHref = "/",
}: {
  children: React.ReactNode;
  navItems?: NavItem[];
  rightSlot?: React.ReactNode;
  showTalkToNocti?: boolean;
  brandHref?: string;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);

  return (
    <WebShellContext.Provider value={{ openTalkToNocti: () => setChatOpen(true) }}>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
          <div className={cn("mx-auto w-full flex items-center justify-between h-16", SHELL_WIDTH, SHELL_PAD)}>
            <Link to={brandHref} className="font-serif italic text-xl tracking-tight">Nocti</Link>

            {navItems.length > 0 && (
              <nav className="hidden md:flex items-center gap-7 text-sm">
                {navItems.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    activeProps={{ className: "text-foreground" }}
                    activeOptions={{ exact: true }}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            )}

            <div className="hidden md:flex items-center gap-2">
              {showTalkToNocti && (
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Talk to Nocti
                </button>
              )}
              {rightSlot}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 -mr-2 text-foreground"
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileOpen && (
            <div className="md:hidden border-t border-border bg-background">
              <div className={cn("mx-auto w-full py-4 flex flex-col gap-3", SHELL_WIDTH, SHELL_PAD)}>
                {navItems.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileOpen(false)}
                    className="text-base text-foreground py-1.5"
                    activeProps={{ className: "font-medium" }}
                  >
                    {n.label}
                  </Link>
                ))}
                {showTalkToNocti && (
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); setChatOpen(true); }}
                    className="inline-flex items-center gap-2 text-base text-foreground py-1.5"
                  >
                    <MessageSquare className="h-4 w-4" /> Talk to Nocti
                  </button>
                )}
                {rightSlot && <div className="pt-2 border-t border-border">{rightSlot}</div>}
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 flex flex-col">{children}</div>

        <TalkToNoctiSheet open={chatOpen} onOpenChange={setChatOpen} />
      </div>
    </WebShellContext.Provider>
  );
}

type Ctx = { openTalkToNocti: () => void };
const WebShellContext = React.createContext<Ctx | null>(null);

export function useWebShell(): Ctx {
  const ctx = React.useContext(WebShellContext);
  if (!ctx) {
    return { openTalkToNocti: () => {} };
  }
  return ctx;
}

/** Standard content section — consistent vertical rhythm across pages. */
export function WebSection({
  className,
  children,
  bleed,
  ...props
}: React.HTMLAttributes<HTMLElement> & { bleed?: boolean }) {
  return (
    <section
      className={cn(
        bleed ? "" : cn("mx-auto w-full", SHELL_WIDTH, SHELL_PAD),
        "py-12 md:py-20",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/** Inner container for a `bleed` section (full-width band, contained content). */
export function WebContainer({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mx-auto w-full", SHELL_WIDTH, SHELL_PAD, className)} {...props}>
      {children}
    </div>
  );
}

export function WebFooter() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className={cn("mx-auto w-full flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground py-7", SHELL_WIDTH, SHELL_PAD)}>
        <span>© {new Date().getFullYear()} Nocti</span>
        <div className="flex gap-5">
          <Link to="/driver/auth" className="hover:text-foreground">Drivers</Link>
          <Link to="/company/auth" className="hover:text-foreground">Carriers</Link>
        </div>
      </div>
    </footer>
  );
}