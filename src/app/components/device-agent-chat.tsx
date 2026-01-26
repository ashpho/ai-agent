"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

const PATIENT_FIRST_NAME = "Ashley";

const DEVICE_TYPES = [
  "Blood pressure cuff",
  "ECG patch / wearable monitor",
  "Scale",
  "Pulse oximeter",
] as const;

type DeviceType = (typeof DEVICE_TYPES)[number];

type ApiChatRole = "system" | "user" | "assistant";
type ApiChatMsg = { role: ApiChatRole; content: string };

async function callAgent(params: {
  mode: "device_agent";
  patientName: string;
  deviceType: DeviceType;
  messages: ChatMsg[];
}): Promise<string> {
  const { mode, patientName, deviceType, messages } = params;

  // Convert UI messages to API shape
  const apiMessages: ApiChatMsg[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add a lightweight context message every turn so prompts can reference device type
  // This does NOT replace your git prompts; it just injects session context.
  const context: ApiChatMsg = {
    role: "user",
    content: `Context: device type for this session is "${deviceType}". Patient first name is "${patientName}".`,
  };

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      patientName,
      messages: [context, ...apiMessages],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chat API error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as { content?: string; message?: string };

  // Your route.ts typically returns { content: "..." }. Fallback included.
  const content = data.content ?? data.message ?? "";
  if (!content) throw new Error("Chat API returned empty content");
  return content;
}

export default function DeviceAgentChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [deviceIdx, setDeviceIdx] = useState(0);
  const deviceType = DEVICE_TYPES[deviceIdx];

  const endRef = useRef<HTMLDivElement | null>(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start/restart the agent whenever device changes
  useEffect(() => {
    // Prevent double-run in React strict mode from spamming a second init
    if (!didInitRef.current) {
      didInitRef.current = true;
    }

    // Reset UI state for new device session
    setMessages([]);
    setInput("");

    // Kick off the first assistant message via the LLM using git prompts
    (async () => {
      try {
        setLoading(true);

        // We send a "start" user message so the model produces the opening message.
        // Your prompt intake.md already defines the opening; this just triggers it.
        const first = await callAgent({
          mode: "device_agent",
          patientName: PATIENT_FIRST_NAME,
          deviceType,
          messages: [{ role: "user", content: "Start." }],
        });

        setMessages([{ role: "assistant", content: first }]);
      } catch (e: any) {
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceIdx]);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");

    try {
      setLoading(true);

      const reply = await callAgent({
        mode: "device_agent",
        patientName: PATIENT_FIRST_NAME,
        deviceType,
        messages: nextMessages,
      });

      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry — I hit an error sending that. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetToNextDevice() {
    setDeviceIdx((i) => (i + 1) % DEVICE_TYPES.length);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-4 flex h-[70vh] flex-col rounded-md border">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm text-muted-foreground">
            Device Help: {deviceType}
          </div>
          <button
            type="button"
            onClick={resetToNextDevice}
            className="text-sm underline text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            Reset (next device)
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-black text-white"
                  : "mr-auto bg-muted"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="mr-auto mb-3 max-w-[85%] rounded-md bg-muted px-3 py-2 text-sm">
              Typing…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder="Type your response…"
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={loading}
            />
            <button
              onClick={onSend}
              className="rounded-md border px-4 py-2 text-sm"
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
