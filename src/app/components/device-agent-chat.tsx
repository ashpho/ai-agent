"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ApiRole = "system" | "user" | "assistant";
type UiRole = "user" | "assistant";

type Msg = {
  role: ApiRole; // we keep system messages too (hidden) so we can pass device type to /api/chat
  content: string;
  hidden?: boolean; // if true, don't render in UI
};

const PATIENT_FIRST_NAME = "Ashley";

// Device types you want to cycle through with “Reset (next device)”
const DEVICE_TYPES = [
  "Blood pressure cuff",
  "ECG patch / wearable monitor",
  "Scale",
  "Pulse oximeter",
] as const;

function isNonEmpty(text: string) {
  return text.trim().length > 0;
}

async function postChat(args: {
  messages: Array<{ role: ApiRole; content: string }>;
  mode: "device_agent";
  patientName: string;
}) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  // Try to surface real error text
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { content?: string; message?: string };
  const content = data.content ?? data.message;
  if (!content) throw new Error("Empty response from /api/chat");
  return content;
}

export default function DeviceAgentChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Demo/POC identity gate: accept any non-empty entry as “verified”
  const [verified, setVerified] = useState(false);

  const [deviceIdx, setDeviceIdx] = useState(0);
  const deviceType = DEVICE_TYPES[deviceIdx];

  const endRef = useRef<HTMLDivElement | null>(null);

  // Convenience: only render non-hidden messages, and coerce role for UI
  const uiMessages = useMemo(() => {
    return messages
      .filter((m) => !m.hidden)
      .map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as UiRole,
        content: m.content,
      }));
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages.length]);

  function resetToNextDevice() {
    // cycle device type
    setDeviceIdx((i) => (i + 1) % DEVICE_TYPES.length);
  }

  async function startFresh(device: string) {
    setLoading(true);
    setVerified(false);

    // Clear UI + seed hidden device context so the LLM can “see” it.
    // IMPORTANT: this is what makes “header device type” actually work.
    const seed: Msg[] = [
      {
        role: "system",
        hidden: true,
        content: `Device type for this session: ${device}`,
      },
    ];
    setMessages(seed);

    try {
      // Ask the model to produce the first assistant message using prompts/device_agent/*
      const first = await postChat({
        mode: "device_agent",
        patientName: PATIENT_FIRST_NAME,
        messages: seed.map(({ role, content }) => ({ role, content })),
      });

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: first,
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry — something went wrong starting the device help flow. Please try again.",
        },
      ]);
      console.error("DeviceAgentChat start error:", e);
    } finally {
      setLoading(false);
    }
  }

  // Start on mount AND whenever the device type changes (Reset next device)
  useEffect(() => {
    void startFresh(deviceType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceType]);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    // append user message to UI
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    // Demo PHI gate:
    // - First user entry after the opening message flips verified=true (any non-empty entry)
    // - Then we continue the conversation via /api/chat
    if (!verified) {
      if (isNonEmpty(text)) {
        setVerified(true);
      }
      // Regardless, continue through LLM so it feels conversational (no hard-coded “Reply yes/no”)
    }

    setLoading(true);
    try {
      // Build the API message list (include hidden system device context)
      const apiMsgs = [...messages, { role: "user" as const, content: text }]
        .map((m) => ({ role: m.role, content: m.content }));

      // Add one more hidden system hint when not verified yet, so the model knows we're in demo-bypass mode
      const apiMsgsWithHints = verified
        ? apiMsgs
        : [
            ...apiMsgs.slice(0, 1), // keep the first system device context
            {
              role: "system" as const,
              content:
                "Demo mode: accept any non-empty reply as identity verification; do not block the conversation on DOB/name formatting.",
            },
            ...apiMsgs.slice(1),
          ];

      const reply = await postChat({
        mode: "device_agent",
        patientName: PATIENT_FIRST_NAME,
        messages: apiMsgsWithHints,
      });

      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("DeviceAgentChat send error:", e);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry — I had trouble processing that. Please try again, or click Reset (next device).",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-4 flex h-[70vh] flex-col rounded-md border">
        <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
          <div>Device Help: {deviceType}</div>
          <button
            type="button"
            onClick={resetToNextDevice}
            className="underline"
          >
            Reset (next device)
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {uiMessages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto bg-black text-white"
                  : "mr-auto bg-muted"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSend();
              }}
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
    </div>
  );
}
