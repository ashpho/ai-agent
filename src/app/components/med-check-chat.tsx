"use client";

import * as React from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function MedCheckChat() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi — I’m going to do a quick Day 8 post-titration medication check. I’ll confirm each medication on your plan and note any discrepancies.\n\nTo start: are you taking losartan (Cozaar) as intended? If yes: what time of day do you take it, and did you miss any doses in the past 7 days?",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(true);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    // optimistic UI
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "med_check",
          messages: nextMessages,
        }),
      });

      const data = (await res.json()) as { reply?: string };

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "(No reply returned)" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry — something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h2 className="text-xl font-semibold">GDMT Medication Check</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Day 8 post-titration medication reconciliation (POC)
      </p>

      {showBanner && (
        <div className="mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-yellow-900">
              Prototype for testing prompt behavior only. Does not provide medical advice. If this
              is an emergency, call 911.
            </p>
            <button
              type="button"
              className="shrink-0 text-xs underline"
              onClick={() => setShowBanner(false)}
              aria-label="Dismiss disclaimer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border bg-background p-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-black text-white ml-10" : "bg-muted mr-10"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            placeholder="Type your response here…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            disabled={loading}
          />
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm"
            onClick={sendMessage}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MedCheckChat;
