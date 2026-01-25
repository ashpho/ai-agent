"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

const PATIENT_FIRST_NAME = "Ashley";

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
  return text.trim().toLowerCase().startsWith("y");
}

export default function DeviceAgentChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [nameVerified, setNameVerified] = useState(false);
  const [dobVerified, setDobVerified] = useState(false);
  const [consented, setConsented] = useState(false);

  const didInit = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    setMessages([
      {
        role: "assistant",
        content: [
          `Hi ${PATIENT_FIRST_NAME} — this is your cardiac monitoring team.`,
          ``,
          `We haven’t received a recent blood pressure transmission from your device.`,
          `This usually means the device, phone, or app isn’t connecting properly.`,
          ``,
          `Before we discuss your account, please reply with:`,
          `1) Your full name`,
          `2) Your date of birth (MM/DD/YYYY)`,
          ``,
          `Example: "Ashley Gibson, 04/04/1945"`,
        ].join("\n"),
      },
    ]);
  }, []);

  function say(text: string) {
    setMessages((m) => [...m, { role: "assistant", content: text }]);
  }

  function handleVerification(text: string) {
    if (!nameVerified) {
      const name = extractName(text);
      if (name) setNameVerified(true);
    }

    if (!dobVerified) {
      const dob = extractDob(text);
      if (dob) setDobVerified(true);
    }

    if (!nameVerified && !dobVerified) {
      say(
        `Thanks — please reply with your full name *and* date of birth in MM/DD/YYYY format.`
      );
      return;
    }

    if (!nameVerified) {
      say(`Thanks — please confirm your full name.`);
      return;
    }

    if (!dobVerified) {
      say(
        `Thanks — please reply with your date of birth in MM/DD/YYYY format.`
      );
      return;
    }

    // PHI accepted (testing mode)
    say(
      `Thanks — I’ve verified your information. Is now a good time for a quick 2–3 minute device check to restore transmissions?`
    );
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
        say(`Great — let’s get your device transmitting again.`);
        say(`Is your blood pressure cuff powered on and nearby right now?`);
      } else {
        say(
          `No problem. Reply “yes” when you’re ready, or contact the clinic if this is urgent.`
        );
      }
      return;
    }

    say(`Is Bluetooth turned on and is your phone nearby?`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-4 flex h-[70vh] flex-col rounded-md border">
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
