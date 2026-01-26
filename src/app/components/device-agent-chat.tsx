"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type ChatMsg = { role: Role; content: string };

const PATIENT_NAME = "Ashley";

const DEVICE_TYPES = [
  "Blood pressure cuff",
  "ECG patch / wearable monitor",
  "Scale",
  "Pulse oximeter",
] as const;

async function callChatApi(messages: ChatMsg[]) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "device_agent",        // ✅ ALWAYS
      patientName: PATIENT_NAME,
      messages: messages ?? [],    // ✅ ALWAYS (never undefined)
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }

  const data = await res.json();
  return (data.reply ?? "").trim();
}

export default function DeviceAgentChat() {
  const [deviceIdx, setDeviceIdx] = useState(0);
  const deviceType = DEVICE_TYPES[deviceIdx];

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  const deviceSystemMsg = useMemo<ChatMsg>(
    () => ({
      role: "system",
      content: `Device type for this session: ${deviceType}`,
    }),
    [deviceType]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Reset + re-init on device change
    setMessages([]);
    setInput("");
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceType]);

  async function start() {
    setLoading(true);
    try {
      const reply = await callChatApi([
        deviceSystemMsg,
        { role: "user", content: "Start device help flow." },
      ]);

      setMessages([{ role: "assistant", content: reply }]);
    } catch {
      setMessages([
        {
          role: "assistant",
          content:
            "Sorry — something went wrong starting the device help flow. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;

    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const reply = await callChatApi([deviceSystemMsg, ...next]);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...next,
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
    <div className="border rounded-md">
      <div className="border-b px-4 py-2 flex justify-between text-sm">
        <div>
          <strong>Device Help:</strong> {deviceType}
        </div>
        <button
          className="underline"
          onClick={() => setDeviceIdx((i) => (i + 1) % DEVICE_TYPES.length)}
        >
          Reset (next device)
        </button>
      </div>

      <div className="p-4 space-y-3 min-h-[520px]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-md px-3 py-2 text-sm max-w-[85%] ${
              m.role === "user"
                ? "bg-black text-white ml-auto"
                : "bg-muted"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Type your response…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button
          className="border rounded-md px-4 py-2 text-sm"
          onClick={send}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
