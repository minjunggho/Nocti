import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ExternalLink, Smartphone } from "lucide-react";

/**
 * Right-anchored sheet that frames the mobile-app shell inside a phone bezel
 * so users can preview the app experience without leaving the website.
 * Loaded via iframe pointing at the same origin's /app routes.
 */
export function MobilePreviewSheet({
  open, onOpenChange, path,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Path to load inside the phone frame, e.g. "/app" or "/app/companies/ridgeline". */
  path: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0 bg-muted/40"
      >
        <SheetHeader className="px-5 py-4 border-b border-border bg-background space-y-0.5 text-left">
          <SheetTitle className="font-serif text-2xl flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            Mobile preview
          </SheetTitle>
          <SheetDescription className="text-xs">
            What drivers and carriers will see on their phone. Tap around — it's interactive.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
          {/* Phone bezel */}
          <div className="relative h-full max-h-[760px] w-full max-w-[360px] rounded-[40px] bg-foreground p-2 shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-28 rounded-b-2xl bg-foreground z-10" />
            <div className="h-full w-full rounded-[32px] overflow-hidden bg-background">
              {open && (
                <iframe
                  key={path}
                  src={path}
                  title="Nocti mobile preview"
                  className="h-full w-full border-0"
                />
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-background flex items-center justify-between text-xs text-muted-foreground">
          <span>Loading <code className="font-mono">{path}</code></span>
          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}