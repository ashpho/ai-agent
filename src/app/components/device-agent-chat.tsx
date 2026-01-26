// src/app/components/device-agent-chat.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "system" | "user" | "assistant";
type ChatMsg = { role: Role; content: string };

const PATIENT_FIRST_NAME = "Ashley";

const DEVICE_TYPES = [
  "Blood pressure cuff",
  "ECG patch / wearable monitor",
  "Scale",
  "Pulse oximeter",
] as const;

export default function DeviceAgentChat() {
  // IMPORTANT: explicitly type state so role doesn't widen to `string`
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // device cycling lives here
  const [deviceIdx, setDeviceIdx] = useState(0);
  const deviceType = DEVICE_TYPES[deviceIdx];

  const endRef = useRef<HTMLDivElement | null>(null);

  const uiMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages.length]);

  async function callAgent(next: ChatMsg[]) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "device_agent", // ALWAYS device_agent so prompts/device_agent/* is used
        patientName: PATIENT_FIRST_NAME,
        // include device type as a system message so the prompt can branch
        messages: [
          { role: "system", content: `Device type for this session: ${deviceType}` },
          ...next.filter((m) => m.role !== "system"),
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    const data = (await res.json()) as { reply?: string; error?: string };

    const reply = (data.reply ?? "").trim();
    if (!reply) {
      throw new Error(data.error || "Empty reply from model");
    }

    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
  }

  async function startFlow() {
    setLoading(true);
    try {
      // Clear UI + kick off the FIRST assistant message from prompts (intake/system)
      setMessages([]);
      await callAgent([]);
    } catch (e) {
      console.error(e);
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

  // Start (or restart) whenever device changes
  useEffect(() => {
    void startFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceIdx]);

  async function onSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // type next explicitly so role stays Role union (not string)
    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];

    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      await callAgent(next);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I hit an error processing that. Please try again (or click Reset to restart).",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onResetNextDevice(e: React.MouseEvent) {
    e.preventDefault();
    setDeviceIdx((i) => (i + 1) % DEVICE_TYPES.length);
  }

  return (
    <div className="border rounded-md">
      <div className="flex items-center justify-between border-b p-3">
        <div className="text-sm">
          <span className="font-medium">Device Help:</span> {deviceType}
        </div>

        {/* Keep reset link */}
        <a
          href="#"
          onClick={onResetNextDevice}
          className="text-sm underline"
          aria-label="Reset to next device"
        >
          Reset (next device)
        </a>
      </div>

      <div className="p-4 space-y-3 min-h-[520px]">
        {uiMessages.map((m, idx) => (
          <div key={idx} className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {m.role === "user" ? PATIENT_FIRST_NAME.toLowerCase() : "Assistant"}
            </div>
            <div
              className={`whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${
                m.role === "user" ? "bg-black text-white" : "mr-auto bg-muted"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void onSend()}
            placeholder={loading ? "Working…" : "Type your response…"}
            className="w-full rounded-md border px-3 py-2 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => void onSend()}
            className="rounded-md border px-4 py-2 text-sm"
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
