import { Link, useLocation } from "@tanstack/react-router";
import { Home, Map, Building2, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/map", label: "Map", icon: Map },
  { to: "/app/companies", label: "Companies", icon: Building2 },
  { to: "/app/nocti", label: "Nocti", icon: MessageCircle },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/app" ? pathname === "/app" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-[11px]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} strokeWidth={active ? 2.25 : 1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}