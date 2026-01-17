"use client";

import * as React from "react";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const NAME_KEY = "rs_medcheck_name_v1";

function firstTokenName(s: string) {
  const t = s.trim();
  if (!t) return "";
  return t.split(/\s+/)[0];
}

export function MedCheckChat() {
  const [patientName, setPatientName] = React.useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(NAME_KEY) || "";
  });

  const [messages, setMessages] = React.useState<Message[]>(() => {
    const name = typeof window !== "undefined" ? window.localStorage.getItem(NAME_KEY) || "" : "";
    if (name) {
      return [
        {
          role: "assistant",
          content: `Hi ${name} — quick Day 8 post-titration medication check. I’ll confirm each medication on your plan and note any discrepancies.\n\nLet’s start: are you taking **losartan (Cozaar)** as prescribed? If yes, what time of day do you take it, and did you miss any doses in the past 7 days?`,
        },
      ];
    }
    return [
      {
        role: "assistant",
        content: "Hi there — before we get started, what’s your first name?",
      },
    ];
  });

  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(true);

  function clearAll() {
    if (typeof window !== "undefined") window.localStorage.removeItem(NAME_KEY);
    setPatientName("");
    setMessages([
      { role: "assistant", content: "Hi there — before we get started, what’s your first name?" },
    ]);
    setInput("");
    setLoading(false);
  }

  async function onSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // optimistic UI: add user message
    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // 1) Name gate: first user response becomes the name (no API call yet)
    if (!patientName) {
      const name = firstTokenName(trimmed);
      if (!name) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry — I didn’t catch that. What’s your first name?" },
        ]);
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") window.localStorage.setItem(NAME_KEY, name);
      setPatientName(name);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `Thanks, ${name}. I’m going to do a quick Day 8 post-titration medication check. ` +
            `I’ll confirm each medication on your plan and note any discrepancies.`,
        },
        {
          role: "assistant",
          content:
            "Let’s start with your ARB.\n\nAre you taking **losartan (Cozaar)** as prescribed? " +
            "If yes, what time of day do you usually take it, and did you miss any doses in the past 7 days?",
        },
      ]);

      setLoading(false);
      return;
    }

    // 2) Normal flow: call /api/chat with a safe, minimal payload
    try {
      const payload = {
        mode: "med_check",
        patientName,
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { reply?: string; error?: string };

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: (data.reply || "").trim() || "Sorry — I didn’t get a response. Please try again.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {patientName ? <>Patient: <span className="text-foreground font-medium">{patientName}</span></> : <>Collecting name…</>}
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          disabled={loading}
          title="Clear name + restart"
        >
          Clear
        </button>
      </div>

      {showBanner && (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-yellow-900">
              Prototype for testing prompt behavior only. Not medical advice. If this is an emergency, call 911.
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

      <div className="rounded-xl border bg-background p-4">
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
            placeholder={patientName ? "Type your response…" : "Type your first name…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
            disabled={loading}
          />
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm"
            onClick={onSend}
            disabled={loading}
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MedCheckChat;
