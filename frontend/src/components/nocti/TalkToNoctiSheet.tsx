import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { noctiPrompts, cannedReplies } from "@/data/mock";
import { Send, Sparkles } from "lucide-react";

type Msg = { id: string; role: "user" | "assistant"; text: string };

function pickReply(q: string) {
  const s = q.toLowerCase();
  if (/rate|\$\/mi|dallas|atlanta|memphis/.test(s)) return cannedReplies.rate;
  if (/compare|vs/.test(s)) return cannedReplies.compare;
  if (/70.?hour|hos|hours of service|reset/.test(s)) return cannedReplies.hours;
  return cannedReplies.default;
}

/**
 * Right-anchored chat drawer. Used everywhere we previously linked to
 * /app/nocti — keeps the user on the website instead of jumping to the
 * mobile shell.
 */
export function TalkToNoctiSheet({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [msgs, setMsgs] = React.useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("nocti-chat") || "[]"); } catch { return []; }
  });
  const [input, setInput] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("nocti-chat", JSON.stringify(msgs));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: pickReply(text) }]);
    }, 450);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-5 py-4 border-b border-border space-y-0.5 text-left">
          <SheetTitle className="font-serif text-2xl flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Talk to <em className="italic font-serif">Nocti</em>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Your co-pilot for rates, regulations, and carrier comparisons.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {msgs.length === 0 && (
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Try one of these</p>
              {noctiPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="block w-full text-left rounded-xl border border-border bg-card p-3 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-card border border-border text-foreground"
                }`}
                dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
              />
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="border-t border-border bg-background px-3 py-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Nocti anything…"
            className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground text-background h-11 w-11 inline-flex items-center justify-center shrink-0"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}