import { Link, useNavigate } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { TalkToNoctiSheet } from "./TalkToNoctiSheet";

const ACCENT = "#5B7FFF";

const navLinkClass =
  "relative text-[13px] text-[#71717A] hover:text-[#0A0A0A] transition-colors py-1";
const navLinkActive =
  "text-[color:var(--nocti-accent)] after:absolute after:left-0 after:right-0 after:-bottom-[6px] after:h-[2px] after:bg-[color:var(--nocti-accent)]";

/**
 * Sticky 56px top nav shared by every /driver/* page.
 * Active link = cornflower text + 2px underline below baseline (no pill, no bold change).
 */
export function DriverHeader() {
  const nav = useNavigate();
  const [chatOpen, setChatOpen] = React.useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b"
        style={{ borderColor: "#E7E5E4", ["--nocti-accent" as any]: ACCENT }}
      >
        <div className="mx-auto max-w-[1280px] px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-serif italic text-xl leading-none">Nocti</Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/driver" className={navLinkClass} activeProps={{ className: navLinkActive }} activeOptions={{ exact: true }}>Dashboard</Link>
              <Link to="/driver/carriers" className={navLinkClass} activeProps={{ className: navLinkActive }}>Carriers</Link>
              <Link to="/driver/map" className={navLinkClass} activeProps={{ className: navLinkActive }}>Map</Link>
              <Link to="/driver/profile" className={navLinkClass} activeProps={{ className: navLinkActive }}>Profile</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white border px-3 py-1.5 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAF9] transition-colors"
              style={{ borderColor: "#E7E5E4" }}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Talk to Nocti
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); nav({ to: "/driver/auth" }); }}
              className="text-[13px] text-[#71717A] hover:text-[#0A0A0A]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <TalkToNoctiSheet open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}