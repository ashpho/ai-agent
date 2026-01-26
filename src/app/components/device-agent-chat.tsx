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

function isYes(text: string) {
  const t = text.trim().toLowerCase();
  return t === "y" || t === "yes" || t.startsWith("yes ");
}

function isNo(text: string) {
  const t = text.trim().toLowerCase();
  return t === "n" || t === "no" || t.startsWith("no ");
}

function initialAssistantMessage(deviceType: string) {
  return [
    `Hi — we noticed we have not received a recent transmission from your ${deviceType}.`,
    `This can happen for simple reasons (Bluetooth/app connectivity), and we can fix it quickly.`,
    ``,
    `Before we discuss your account, please reply with your full name and date of birth (MM/DD/YYYY).`,
  ].join("\n");
}

type Step = "power" | "bluetooth" | "sync_wait" | "sync_check" | "closed";

export default function DeviceAgentChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading] = useState(false);

  const [nameVerified, setNameVerified] = useState(false);
  const [dobVerified, setDobVerified] = useState(false);
  const [consented, setConsented] = useState(false);

  const [deviceIdx, setDeviceIdx] = useState(0);
  const deviceType = DEVICE_TYPES[deviceIdx];

  const [step, setStep] = useState<Step>("power");

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages([{ role: "assistant", content: initialAssistantMessage(deviceType) }]);
    setInput("");
    setNameVerified(false);
    setDobVerified(false);
    setConsented(false);
    setStep("power");
  }, [deviceType]);

  function say(text: string) {
    setMessages((m) => [...m, { role: "assistant", content: text }]);
  }

  function resetToNextDevice() {
    setDeviceIdx((i) => (i + 1) % DEVICE_TYPES.length);
  }

  function handleVerification(text: string) {
    const foundName = !nameVerified ? extractName(text) : null;
    const foundDob = !dobVerified ? extractDob(text) : null;

    const nextNameVerified = nameVerified || Boolean(foundName);
    const nextDobVerified = dobVerified || Boolean(foundDob);

    if (foundName) setNameVerified(true);
    if (foundDob) setDobVerified(true);

    if (!nextNameVerified && !nextDobVerified) {
      say(`Thanks — please reply with your full name and date of birth (MM/DD/YYYY).`);
      return;
    }
    if (!nextNameVerified) {
      say(`Thanks — please confirm your full name.`);
      return;
    }
    if (!nextDobVerified) {
      say(`Thanks — please reply with your date of birth in MM/DD/YYYY format.`);
      return;
    }

    say(
      `Thanks ${PATIENT_FIRST_NAME} — I’ve verified your information. Is now a good time for a quick 2–3 minute device check to restore transmissions? (Reply “yes” or “no”)`
    );
  }

  function closeSuccess() {
    say(`Great — thanks. We’ll keep monitoring for new transmissions. If anything changes, we’ll reach out.`);
    setStep("closed");
  }

  function closeEscalate() {
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
    setStep("closed");
  }

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    if (!nameVerified || !dobVerified) {
      handleVerification(text);
      return;
    }

    if (!consented) {
      if (isYes(text)) {
        setConsented(true);
        setStep("power");
        say(`Great — let’s get your ${deviceType} transmitting again.`);
        say(`Is the device powered on and nearby right now?`);
      } else if (isNo(text)) {
        say(`No problem. Reply “yes” when you’re ready.`);
      } else {
        say(`Please reply “yes” or “no”.`);
      }
      return;
    }

    if (step === "power") {
      if (isYes(text)) {
        setStep("bluetooth");
        say(`Is your phone nearby and is Bluetooth turned on?`);
      } else if (isNo(text)) {
        say(`Please power on the device and reply “yes” when it’s ready.`);
      } else {
        say(`Please reply “yes” or “no”.`);
      }
      return;
    }

    if (step === "bluetooth") {
      if (isYes(text)) {
        setStep("sync_wait");
        say(`Thanks — please open the app and wait 30–60 seconds for it to sync.`);
        say(`Did it sync? Reply “yes” if you see it connected/synced in the app, or “no” if not.`);
        setStep("sync_check");
      } else if (isNo(text)) {
        say(`Please turn on Bluetooth and keep your phone nearby, then reply “yes”.`);
      } else {
        say(`Please reply “yes” or “no”.`);
      }
      return;
    }

    if (step === "sync_check") {
      if (isYes(text)) {
        closeSuccess();
      } else if (isNo(text)) {
        closeEscalate();
      } else {
        say(`Please reply “yes” or “no”.`);
      }
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
