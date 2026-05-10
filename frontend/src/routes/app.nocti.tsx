import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Eyebrow, DisplayHeading } from "@/components/nocti/primitives";
import { noctiPrompts, cannedReplies } from "@/data/mock";
import { Send } from "lucide-react";

export const Route = createFileRoute("/app/nocti")({
  head: () => ({ meta: [{ title: "Talk to Nocti" }, { name: "description", content: "Your AI co-pilot for rates, regulations, and carrier comparisons." }] }),
  component: Chat,
});

type Msg = { id: string; role: "user" | "assistant"; text: string };

function pickReply(q: string) {
  const s = q.toLowerCase();
  if (/rate|\$\/mi|dallas|atlanta|memphis/.test(s)) return cannedReplies.rate;
  if (/compare|vs/.test(s)) return cannedReplies.compare;
  if (/70.?hour|hos|hours of service|reset/.test(s)) return cannedReplies.hours;
  return cannedReplies.default;
}

function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("nocti-chat") || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    }, 500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)]">
      <header className="px-5 pt-8 pb-4 border-b border-border">
        <Eyebrow>Your co-pilot</Eyebrow>
        <DisplayHeading as="h2" className="mt-2">Talk to <em className="italic">Nocti</em>.</DisplayHeading>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            {noctiPrompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="block w-full text-left rounded-lg border border-border bg-card p-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
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
        <button type="submit" className="rounded-full bg-foreground text-background h-11 w-11 inline-flex items-center justify-center" aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
