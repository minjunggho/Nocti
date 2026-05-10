import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PillButton } from "@/components/nocti/primitives";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, RefreshCw } from "lucide-react";
import type { Driver, Company } from "@/data/mock";

type Channel = "email" | "sms";
type Tone = "warm" | "direct" | "casual";

export function OutreachDialog({
  open, onOpenChange, driver, company,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driver: Driver;
  company: Company | null;
}) {
  const [tone, setTone] = useState<Tone>("warm");
  const [channel, setChannel] = useState<Channel>("email");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!company) {
      toast.error("Finish your carrier profile first.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-outreach", {
        body: { driver, company, tone, channel },
      });
      if (error) throw error;
      const d = (data as { draft?: string; error?: string } | null);
      if (d?.error) throw new Error(d.error);
      setDraft(d?.draft ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't draft outreach");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !draft && company) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && company) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, channel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Reach out to {driver.firstName} <em className="italic">{driver.lastName}</em>
          </DialogTitle>
          <DialogDescription>
            AI drafted a personalized message using your ICP and this driver's profile. Edit before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS / text</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={loading ? "Drafting…" : "Your message will appear here."}
            className="min-h-[260px] font-mono text-sm leading-relaxed"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-between">
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> Regenerate
          </button>
          <div className="flex gap-2">
            <PillButton
              variant="secondary"
              type="button"
              onClick={async () => {
                if (!draft) return;
                await navigator.clipboard.writeText(draft);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-1.5" /> Copy
            </PillButton>
            <PillButton
              type="button"
              onClick={() => {
                if (!draft.trim()) return;
                toast.success(`Outreach queued to ${driver.firstName}`);
                onOpenChange(false);
                setDraft("");
              }}
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> Send
            </PillButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}