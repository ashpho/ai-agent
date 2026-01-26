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
type Phase = "verify" | "consent" | "troubleshoot" | "closed";
type Step = "power" | "bluetooth" | "sync_check";

function extractName(text: string): string | null {
  const cleaned = text.replace(/\d.*$/, "").replace(/[,;]/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function extractDob(text: string): string | null {
  const m = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!m) return null;

  let mm = parseInt(m[1], 10);
  let dd = parseInt(m[2], 10);
  let yy = parseInt(m[3], 10);

  if (yy < 100) yy = yy >= 30 ? 1900 + yy : 2000 + yy;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  return `${String(mm).padStart(2, "0")}/${String(dd).padStart(2, "0")}/${yy}`;
}

function norm(text: string) {
  return text.trim().toLowerCase();
}
function isYes(text: string) {
  const t = norm(text);
  return t === "y" || t === "yes" || t.startsWith("yes ");
}
function isNo(text: string) {
  const t = norm(text);
  return t === "n" || t === "no" || t.startsWith("no ");
}

function initialAssistantMessage(deviceType: DeviceType) {
  return [
    `Hi — we noticed we haven’t received a recent transmission from your ${deviceType}.`,
    `This is often due to Bluetooth or app connectivity, and we can usually fix it quickly.`,
    ``,
    `Before we discuss your account, please reply with your full name and date of birth (MM/DD/YYYY).`,
    ``,
    `Example: "Ashley Gibson, 04/04/1945"`,
  ].join("\n");
}

// “Agentic” replies when user gives free text at a yes/no checkpoint
function freeTextBridge(deviceType: DeviceType, step: Step, text: string): string[] {
  const t = norm(text);

  if (step === "power") {
    if (t.includes("look like") || t.includes("which") || t.includes("what")) {
      if (deviceType === "Blood pressure cuff") {
        return [
          `Usually it’s an arm cuff with a small display/button, or a cuff that connects to an app.`,
          `If you see a power/start button or a screen, that’s the right one.`,
          `Is the device powered on and nearby right now? Reply “yes” or “no”.`,
        ];
      }
      return [
        `Totally fair question.`,
        `For today we’re checking the ${deviceType} shown in the header.`,
        `Is it powered on and nearby right now? Reply “yes” or “no”.`,
      ];
    }

    if (t.includes("not sure") || t.includes("dont know") || t.includes("don't know")) {
      return [
        `No problem — we can figure it out together.`,
        `Quick check: do you see the device (or its screen/light) near you right now? Reply “yes” or “no”.`,
      ];
    }

    return [
      `Got it — thanks.`,
      `Is the device powered on and nearby right now? Reply “yes” or “no”.`,
    ];
  }

  if (step === "bluetooth") {
    return [
      `Thanks — that helps.`,
      `Quick fix that often works: toggle Bluetooth off/on, then reopen the app.`,
      `Is your phone nearby and is Bluetooth turned on? Reply “yes” or “no”.`,
    ];
  }

  // sync_check
  if (deviceType === "Scale" && (t.includes("high") || t.includes("wrong") || t.includes("off"))) {
    return [
      `That can happen if the scale is on carpet/soft flooring or didn’t zero out first.`,
      `Try placing it on a hard floor and stepping on after it shows 0.0.`,
      `Did it sync to the app? Reply “yes” or “no”.`,
    ];
  }

  return [
    `Got it — thanks for explaining.`,
    `Did it sync to the app? Reply “yes” or “no”.`,
  ];
}

export default function DeviceAgentChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  const [deviceIdx, setDeviceIdx] = useState(0);
  const deviceType = DEVICE_TYPES[deviceIdx];

  const [phase, setPhase] = useState<Phase>("verify");
  const [step, setStep] = useState<Step>("power");

  const [nameVerified, setNameVerified] = useState(false);
  const [dobVerified, setDobVerified] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset everything when device changes
  useEffect(() => {
    setMessages([{ role: "assistant", content: initialAssistantMessage(deviceType) }]);
    setInput("");
    setPhase("verify");
    setStep("power");
    setNameVerified(false);
    setDobVerified(false);
  }, [deviceType]);

  function say(text: string) {
    setMessages((m) => [...m, { role: "assistant", content: text }]);
  }

  function sayMany(lines: string[]) {
    lines.forEach((l) => say(l));
  }

  function resetToNextDevice() {
    setDeviceIdx((i) => (i + 1) % DEVICE_TYPES.length);
  }

  function handleVerify(text: string) {
    // FIX: compute next values synchronously (no state race)
    const foundName = extractName(text);
    const foundDob = extractDob(text);

    const nextNameVerified = nameVerified || Boolean(foundName);
    const nextDobVerified = dobVerified || Boolean(foundDob);

    if (foundName) setNameVerified(true);
    if (foundDob) setDobVerified(true);

    if (!nextNameVerified || !nextDobVerified) {
      say(`Thanks — please reply with your full name and date of birth (MM/DD/YYYY).`);
      return;
    }

    // Verified → move to consent phase
    setPhase("consent");
    say(
      `Thanks ${PATIENT_FIRST_NAME} — I’ve verified your information. Is now a good time for a quick 2–3 minute device check to restore transmissions?`
    );
    say(`Reply “yes” or “no” — or tell me what works best.`);
  }

  function handleConsent(text: string) {
    if (isNo(text)) {
      say(`No problem. Reply “yes” when you’re ready.`);
      return;
    }

    // Agentic: treat any non-"no" response as proceed for demo flow
    setPhase("troubleshoot");
    setStep("power");
    say(`Great — let’s get your ${deviceType} transmitting again.`);
    say(`Is the device powered on and nearby right now?`);
  }

  function handleTroubleshoot(text: string) {
    // power step expects yes/no but handles free text conversationally
    if (step === "power") {
      if (isYes(text)) {
        setStep("bluetooth");
        say(`Is your phone nearby and is Bluetooth turned on?`);
        return;
      }
      if (isNo(text)) {
        say(`Please power on the device and reply “yes” when it’s ready.`);
        return;
      }
      sayMany(freeTextBridge(deviceType, "power", text));
      return;
    }

    if (step === "bluetooth") {
      if (isYes(text)) {
        setStep("sync_check");
        say(`Thanks — please open the app and wait 30–60 seconds for it to sync.`);
        say(`Did it sync? Reply “yes” or “no” (or tell me what you’re seeing).`);
        return;
      }
      if (isNo(text)) {
        say(`Please turn on Bluetooth and keep your phone nearby, then reply “yes”.`);
        return;
      }
      sayMany(freeTextBridge(deviceType, "bluetooth", text));
      return;
    }

    // sync_check
    if (isYes(text)) {
      setPhase("closed");
      say(`Great — thanks. We’ll keep monitoring for new transmissions.`);
      return;
    }
    if (isNo(text)) {
      setPhase("closed");
      say(
        [
          `Thanks — it looks like it still isn’t syncing.`,
          ``,
          `To help device support follow up, please reply with:`,
          `1) Any error message you see in the app (if any)`,
          `2) What you already tried (Bluetooth/app/restart/pairing/reading)`,
          `3) Best callback time`,
          ``,
          `Our care team/device support will follow up.`,
        ].join("\n")
      );
      return;
    }

    // free text at sync_check
    sayMany(freeTextBridge(deviceType, "sync_check", text));
  }

  function onSend() {
    const text = input.trim();
    if (!text) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    if (phase === "verify") {
      handleVerify(text);
      return;
    }

    if (phase === "consent") {
      handleConsent(text);
      return;
    }

    if (phase === "troubleshoot") {
      handleTroubleshoot(text);
      return;
    }

    // closed
    say(`Thanks — if you need anything else, reply here or contact the clinic.`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-4 flex h-[70vh] flex-col rounded-md border">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm text-muted-foreground">Device Help: {deviceType}</div>
          <button
            type="button"
            onClick={resetToNextDevice}
            className="text-sm underline text-muted-foreground hover:text-foreground"
          >
            Reset (next device)
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${
                m.role === "user" ? "ml-auto bg-black text-white" : "mr-auto bg-muted"
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
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder="Type your response…"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <button onClick={onSend} className="rounded-md border px-4 py-2 text-sm">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
