"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

type DeviceType =
  | "Blood pressure cuff"
  | "ECG patch / wearable monitor"
  | "Scale"
  | "Pulse oximeter";

const DEVICES: DeviceType[] = [
  "Blood pressure cuff",
  "ECG patch / wearable monitor",
  "Scale",
  "Pulse oximeter",
];

const DEMO_PATIENT_NAME = "Ashley";

const LS_DEVICE_IDX = "rs_poc_device_idx_v1";
const LS_THREAD = "rs_poc_device_agent_thread_v2";

function nextDeviceIndex(curr: number) {
  return (curr + 1) % DEVICES.length;
}

export default function DeviceAgentChat() {
  const [deviceIdx, setDeviceIdx] = useState<number>(0);
  const deviceType = useMemo(() => DEVICES[deviceIdx], [deviceIdx]);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Initialize device + first message
  useEffect(() => {
    const savedIdxRaw =
      typeof window !== "undefined" ? localStorage.getItem(LS_DEVICE_IDX) : null;
    const savedIdx = savedIdxRaw ? Number(savedIdxRaw) : 0;
    const safeIdx = Number.isFinite(savedIdx) ? savedIdx : 0;
    setDeviceIdx(Math.min(Math.max(safeIdx, 0), DEVICES.length - 1));

    const savedThread =
      typeof window !== "undefined" ? localStorage.getItem(LS_THREAD) : null;

    if (savedThread) {
      try {
        const parsed = JSON.parse(savedThread) as ChatMsg[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }

    // Default: proactive alert-style opener (more urgent than “routine check”)
    const opener = `Hi ${DEMO_PATIENT_NAME} — we noticed we have not received a recent transmission from your ${deviceType}. This is usually a quick fix (Bluetooth/app connectivity), and we’d like to get you back online today.\n\nBefore we discuss your account, please reply with:\n1) Your full name\n2) Your date of birth (MM/DD/YYYY)`;

    setMessages([{ role: "assistant", content: opener }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist thread
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_THREAD, JSON.stringify(messages));
  }, [messages]);

  // When device changes via reset, refresh opener
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_DEVICE_IDX, String(deviceIdx));

    // Replace thread with a new opener for the new device (simple demo behavior)
    const opener = `Hi ${DEMO_PATIENT_NAME} — we noticed we have not received a recent transmission from your ${deviceType}. This is usually a quick fix (Bluetooth/app connectivity), and we’d like to get you back online today.\n\nBefore we discuss your account, please reply with:\n1) Your full name\n2) Your date of birth (MM/DD/YYYY)`;

    setMessages([{ role: "assistant", content: opener }]);
    setInput("");
  }, [deviceIdx, deviceType]);

  async function sendToApi(updatedMessages: ChatMsg[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "device_agent",
          patientName: DEMO_PATIENT_NAME,
          deviceType,
          messages: updatedMessages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });

      const data = (await res.json()) as { reply?: string };
      const reply = (data.reply ?? "").trim();

      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    await sendToApi(next);
  }

  function onResetNextDevice() {
    const idx = nextDeviceIndex(deviceIdx);
    setDeviceIdx(idx);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Device Help — {DEMO_PATIENT_NAME}
          </span>{" "}
          ({deviceType})
        </div>

        <button
          type="button"
          onClick={onResetNextDevice}
          className="text-sm underline"
        >
          Reset (next device)
        </button>
      </div>

      {/* Chat container with pinned input */}
      <div className="mt-4 flex h-[70vh] flex-col rounded-lg border">
        {/* Scrollable transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-xl bg-black px-4 py-3 text-white"
                      : "max-w-[85%] whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-gray-900"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="text-sm text-muted-foreground">Typing…</div>
            ) : null}
          </div>
        </div>

        {/* Pinned input */}
        <form onSubmit={onSend} className="border-t p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response…"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              className="rounded-md border px-4 py-2 text-sm"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
