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

export default function DeviceAgentChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  const [nameVerified, setNameVerified] = useState(false);
  const [dobVerified, setDobVerified] = useState(false);
  const [consented, setConsented] = useState(false);

  const [step, setStep] = useState(0);
  const [deviceIdx, setDeviceIdx] = useState(0);

  const didInit = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const deviceType = DEVICE_TYPES[deviceIdx];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Re-initialize when device changes (Reset link)
  useEffect(() => {
    didInit.current = false;
    setMessages([]);
    setInput("");
    setNameVerified(false);
    setDobVerified(false);
    setConsented(false);
    setStep(0);
  }, [deviceIdx]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    setMessages([
      {
        role: "assistant",
        content: [
          `Hi — we noticed we haven’t received a recent transmission from your ${deviceType}.`,
          `This is often due to Bluetooth or app connectivity, and we can usually fix it quickly.`,
          ``,
          `Before we discuss your account, please reply with your full name and date of birth (MM/DD/YYYY).`,
          ``,
          `Example: "Ashley Gibson, 04/04/1945"`,
        ].join("\n"),
      },
    ]);
  }, [deviceType]);

  function say(text: string) {
    setMessages((m) => [...m, { role: "assistant", content: text }]);
  }

  function advance() {
    setStep((s) => s + 1);
  }

  function handleVerification(text: string) {
    if (!nameVerified && extractName(text)) setNameVerified(true);
    if (!dobVerified && extractDob(text)) setDobVerified(true);

    if (!nameVerified || !dobVerified) {
      say(
        "Thanks — please reply with your full name and date of birth (MM/DD/YYYY)."
      );
      return;
    }

    say(
      `Thanks ${PATIENT_FIRST_NAME} — I’ve verified your information. Is now a good time for a quick 2–3 minute device check to restore transmissions?`
    );
    advance();
  }

  function handleConversation(text: string) {
    // Consent step
    if (!consented) {
      if (isYes(text)) {
        setConsented(true);
        say(`Great — let’s get your ${deviceType} transmitting again.`);
        say(`Is the device powered on and nearby right now?`);
        advance();
      } else if (isNo(text)) {
        say(
          "No problem. Reply “yes” when you’re ready, or contact the clinic if this is urgent."
        );
      } else {
        say("Got it — just let me know when you’re ready to continue.");
      }
      return;
    }

    // Step-based but conversational (ANY input advances)
    switch (step) {
      case 1:
        say("Thanks — that helps.");
        say("Is your phone nearby and is Bluetooth turned on?");
        advance();
        break;

      case 2:
        say("Okay.");
        say("Please open the app and wait about 30–60 seconds for it to sync.");
        advance();
        break;

      case 3:
        say(
          "Did it sync? You can answer yes or no, or tell me what you’re seeing."
        );
        advance();
        break;

      case 4:
        if (isYes(text)) {
          say("Great — it looks like things are working again. Thanks for checking!");
        } else if (isNo(text)) {
          say(
            "Thanks for checking. Let’s try restarting your phone, toggling Bluetooth off and back on, then reopening the app."
          );
        } else {
          say("Got it — thanks for explaining. That’s helpful.");
        }

        say(
          "If it’s still not working after that, our care team or device support can follow up."
        );
        break;

      default:
        say("Thanks — I’ve noted that.");
    }
  }

  function onSend() {
    const text = input.trim();
    if (!text) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    if (!nameVerified || !dobVerified) {
      handleVerification(text);
      return;
    }

    handleConversation(text);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-4 flex h-[70vh] flex-col rounded-md border">
        <div className="border-b p-3 text-sm font-medium">
          <div className="flex justify-between">
            <span>Device Help: {deviceType}</span>
            <button
              className="underline text-sm"
              onClick={() =>
                setDeviceIdx((i) => (i + 1) % DEVICE_TYPES.length)
              }
            >
              Reset (next device)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {messages.map((m, i) => (
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
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder="Type your response…"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={onSend}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
