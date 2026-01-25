"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

/**
 * Proactive outreach POC
 * - We DO NOT ask for the patient's name.
 * - We assume the platform already knows the patient identity.
 * - For the demo, we hardcode a patient name.
 */
const DEMO_PATIENT_NAME = "Ashley";

export default function DeviceAgentChat() {
  const [patientName, setPatientName] = useState<string>(DEMO_PATIENT_NAME);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);

  // Prevent double kickoff in React StrictMode/dev
  const didKickoffRef = useRef(false);

  // On mount: immediately show a placeholder and kick off proactive outreach.
  useEffect(() => {
    const name = DEMO_PATIENT_NAME;
    setPatientName(name);

    setMessages([
      {
        role: "assistant",
        content: `Hi ${name} — one moment while I check on your monitoring device...`,
      },
    ]);
  }, []);

  // Kick off proactive outreach once (after mount).
  useEffect(() => {
    if (!patientName) return;
    if (didKickoffRef.current) return;
    if (messages.length === 0) return; // wait until placeholder is set

    didKickoffRef.current = true;
    void kickoffProactiveOutreach(patientName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientName, messages.length]);

  async function kickoffProactiveOutreach(name: string) {
    setLoading(true);

    try {
      // Hidden kickoff message to force the model to produce the proactive opening.
      const kickoffUserMessage =
        "Kick off the proactive device outreach now. Do not ask for the patient's name.";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "device_agent",
          patientName: name,
          messages: [{ role: "user", content: kickoffUserMessage }],
        }),
      });

      const data = await res.json();
      const assistantText =
        (data?.reply as string) ?? "Sorry—something went wrong.";

      // Replace placeholder with the actual proactive outreach message
      setMessages([{ role: "assistant", content: assistantText }]);
    } catch {
      setMessages([
        {
          role: "assistant",
          content:
            "Sorry—something went wrong starting the device check-in. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

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
    didKickoffRef.current = false;
    setInput("");
    setLoading(false);

    const name = DEMO_PATIENT_NAME;
    setPatientName(name);

    setMessages([
      {
        role: "assistant",
        content: `Hi ${name} — one moment while I check on your monitoring device...`,
      },
    ]);
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-center justify-between pb-3">
        <div className="text-sm text-muted-foreground">
          Device Help — {patientName}
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
          placeholder="Type your response..."
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
