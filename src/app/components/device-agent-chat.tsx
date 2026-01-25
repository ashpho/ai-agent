"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

const DEMO_PATIENT_NAME = "Ashley";

// Persisted scenario index so refreshes keep cycling
const SCENARIO_IDX_KEY = "rs_poc_device_scenario_idx_v1";

type DeviceScenario = {
  id: string;
  label: string;
  postVerifyNudge: string; // what we want to do AFTER verification (kept generic)
};

const SCENARIOS: DeviceScenario[] = [
  {
    id: "bp_missing_48h",
    label: "Blood pressure cuff",
    postVerifyNudge:
      "Thanks — once I confirm, I’ll help you do a quick blood pressure cuff check and make sure readings are syncing.",
  },
  {
    id: "scale_missing_72h",
    label: "Bluetooth weight scale",
    postVerifyNudge:
      "Thanks — once I confirm, I’ll help you do a quick scale connection check and make sure readings are syncing.",
  },
  {
    id: "pulseox_no_data",
    label: "Pulse oximeter",
    postVerifyNudge:
      "Thanks — once I confirm, I’ll help you do a quick pulse oximeter check and make sure readings are syncing.",
  },
  {
    id: "ecg_patch_gap",
    label: "ECG patch / wearable monitor",
    postVerifyNudge:
      "Thanks — once I confirm, I’ll help you do a quick wearable check to make sure it’s positioned and transmitting.",
  },
  {
    id: "bp_outlier_reading",
    label: "Blood pressure cuff (follow-up)",
    postVerifyNudge:
      "Thanks — once I confirm, I’ll help you do a quick cuff check and then we’ll make sure your next reading goes through.",
  },
];

function clampIdx(n: number, len: number) {
  if (!len) return 0;
  return ((n % len) + len) % len;
}

function initialVerificationMessage(patientName: string) {
  return [
    `Hi ${patientName} — this is a quick outreach from your cardiac monitoring team.`,
    `Before we discuss your account, please reply with:`,
    `1) Your full name`,
    `2) Your date of birth (MM/DD/YYYY)`,
  ].join("\n");
}

export default function DeviceAgentChat() {
  const [patientName] = useState<string>(DEMO_PATIENT_NAME);
  const [scenarioIdx, setScenarioIdx] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // prevent double kickoff in React StrictMode/dev
  const didInitRef = useRef(false);

  const scenario = SCENARIOS[clampIdx(scenarioIdx, SCENARIOS.length)];

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const saved =
      typeof window !== "undefined" ? localStorage.getItem(SCENARIO_IDX_KEY) : null;
    const startIdx = saved
      ? clampIdx(parseInt(saved, 10) || 0, SCENARIOS.length)
      : 0;

    setScenarioIdx(startIdx);

    const intro = initialVerificationMessage(patientName);
    const nudge = SCENARIOS[startIdx].postVerifyNudge;

    // We show verification request + a generic “what happens next” note (still non-PHI)
    setMessages([
      { role: "assistant", content: intro },
      { role: "assistant", content: nudge },
    ]);
  }, [patientName]);

  function advanceScenario() {
    const next = clampIdx(scenarioIdx + 1, SCENARIOS.length);
    setScenarioIdx(next);
    if (typeof window !== "undefined") localStorage.setItem(SCENARIO_IDX_KEY, String(next));

    const intro = initialVerificationMessage(patientName);
    const nudge = SCENARIOS[next].postVerifyNudge;

    setMessages([
      { role: "assistant", content: intro },
      { role: "assistant", content: nudge },
    ]);
    setInput("");
  }

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "device_agent",
          patientName,
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      const reply = (data.reply ?? "").trim();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply || "Thanks — I’m not seeing a reply right now. Please try again.",
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry — something went wrong on my side. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Device Help</span> — {patientName}{" "}
          <span className="text-muted-foreground">({scenario.label})</span>
        </div>

        <button
          type="button"
          onClick={advanceScenario}
          className="text-sm underline text-muted-foreground"
        >
          Reset (next device)
        </button>
      </div>

      <div className="mt-4 space-y-3">
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
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
