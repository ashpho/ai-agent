"use client";

import { useEffect, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

const LS_KEY = "rs_poc_patient_name_device_agent_v1";

export default function DeviceAgentChat() {
  const [patientName, setPatientName] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

    if (saved) {
      setPatientName(saved);
      setMessages([
        {
          role: "assistant",
          content: `Welcome back, ${saved}. What device issue can I help you with today?`,
        },
      ]);
    } else {
      setMessages([
        {
          role: "assistant",
          content: "Hi there — before we get started, what’s your first name?",
        },
      ]);
    }
  }, []);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    // If we don't have a name yet, treat first input as name and don't call API.
    if (!patientName) {
      localStorage.setItem(LS_KEY, text);
      setPatientName(text);
      setInput("");
      setMessages([
        {
          role: "assistant",
          content: `Thanks, ${text}. What device issue can I help you with today?`,
        },
      ]);
      return;
    }

    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "device_agent",
          patientName,
          messages: nextMessages,
        }),
      });

      const data = await res.json();
      const assistantText =
        (data?.reply as string) ?? "Sorry—something went wrong.";
      setMessages([...nextMessages, { role: "assistant", content: assistantText }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Sorry—something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    localStorage.removeItem(LS_KEY);
    setPatientName("");
    setInput("");
    setLoading(false);
    setMessages([
      {
        role: "assistant",
        content: "Hi there — before we get started, what’s your first name?",
      },
    ]);
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-center justify-between pb-3">
        <div className="text-sm text-muted-foreground">
          Device Help {patientName ? `— ${patientName}` : ""}
        </div>
        <button className="text-sm underline" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-black text-white ml-10"
                : "bg-muted mr-10"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          placeholder={patientName ? "Type your response..." : "Type your first name..."}
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
  );
}
