"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

type DeviceTemplate = {
  label: string;
  intro: string; // why we're contacting them (urgent context)
  quickChecks: string[]; // scripted troubleshooting steps after verification
};

const DEMO_PATIENT_FIRST_NAME = "Ashley";
const DEMO_EXPECTED_FULL_NAME = "Ashley Gibson";
const DEMO_EXPECTED_DOB = "05/05/1991"; // MM/DD/YYYY

const DEVICE_TEMPLATES: DeviceTemplate[] = [
  {
    label: "Blood pressure cuff",
    intro:
      "We haven’t received a blood pressure transmission from your monitoring device recently. This can happen if Bluetooth is off, the phone/app isn’t running, or the cuff hasn’t synced. Let’s fix it now so your care team has your readings.",
    quickChecks: [
      "Is your blood pressure cuff nearby and powered on?",
      "Is Bluetooth ON on your phone?",
      "Is your companion app open (and allowed to run in the background)?",
      "Do you have Wi-Fi or cellular signal right now?",
      "Please take one blood pressure reading now, then wait 60 seconds and tell me if the app shows it synced.",
    ],
  },
  {
    label: "Weight scale",
    intro:
      "We haven’t received a recent weight transmission from your scale. Weight trends are important for heart failure monitoring. Let’s troubleshoot syncing so today’s reading reaches your care team.",
    quickChecks: [
      "Is the scale powered on (or does it wake when you step on it)?",
      "Is Bluetooth ON on your phone?",
      "Is your companion app open and signed in?",
      "Do you have Wi-Fi or cellular signal right now?",
      "Please step on the scale once now. Tell me whether the app shows the weight synced.",
    ],
  },
  {
    label: "Pulse oximeter",
    intro:
      "We haven’t received a recent oxygen/heart rate transmission from your pulse oximeter. Let’s make sure it’s pairing and sending readings correctly.",
    quickChecks: [
      "Is the pulse oximeter charged and turning on?",
      "Is Bluetooth ON on your phone?",
      "Is the companion app open and allowed to run in the background?",
      "Do you have Wi-Fi or cellular signal right now?",
      "Please take one reading now. Tell me whether the app shows it synced.",
    ],
  },
  {
    label: "ECG patch / wearable monitor",
    intro:
      "We haven’t received a recent transmission from your wearable/ECG monitor. This can happen if the phone isn’t nearby, Bluetooth is off, or the patch/monitor isn’t positioned well. Let’s troubleshoot now so monitoring continues.",
    quickChecks: [
      "Is the wearable/patch currently on and worn as instructed?",
      "Is your phone nearby (within ~10 feet)?",
      "Is Bluetooth ON on your phone?",
      "Is the companion app open and allowed to run in the background?",
      "Do you have Wi-Fi or cellular signal right now?",
    ],
  },
];

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

// Accepts MM/DD/YYYY, M/D/YYYY, MM/DD/YY, M/D/YY, and converts to MM/DD/YYYY when possible.
// Returns null if not parseable.
function parseDobToMMDDYYYY(input: string): string | null {
  const raw = input.trim();

  // Find something that looks like a date in the string
  const m = raw.match(/(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})/);
  if (!m) return null;

  let mm = parseInt(m[1], 10);
  let dd = parseInt(m[2], 10);
  let yy = parseInt(m[3], 10);

  if (Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(yy)) return null;
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  // If 2-digit year, assume 19xx/20xx (simple heuristic)
  if (yy < 100) yy = yy >= 30 ? 1900 + yy : 2000 + yy;

  const mmStr = String(mm).padStart(2, "0");
  const ddStr = String(dd).padStart(2, "0");
  const yyStr = String(yy);

  return `${mmStr}/${ddStr}/${yyStr}`;
}

function isYes(text: string) {
  const t = text.trim().toLowerCase();
  return t === "yes" || t === "y" || t.startsWith("yes ");
}

export default function DeviceAgentChat() {
  const [deviceIndex, setDeviceIndex] = useState(0);

  const device = useMemo(() => DEVICE_TEMPLATES[deviceIndex], [deviceIndex]);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // PHI verification state
  const [isVerified, setIsVerified] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [pendingDob, setPendingDob] = useState<string | null>(null);
  const [hasConsentedToTroubleshoot, setHasConsentedToTroubleshoot] = useState(false);

  // Prevent double-init in StrictMode/dev
  const didInitRef = useRef(false);

  // Scroll to bottom
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function resetToNextDevice() {
    setDeviceIndex((i) => (i + 1) % DEVICE_TEMPLATES.length);
    setInput("");
    setLoading(false);
    setIsVerified(false);
    setPendingName(null);
    setPendingDob(null);
    setHasConsentedToTroubleshoot(false);

    // Rebuild the proactive outreach message
    const introMsg: ChatMsg = {
      role: "assistant",
      content: [
        `Hi ${DEMO_PATIENT_FIRST_NAME} — this is your cardiac monitoring team.`,
        ``,
        device.intro,
        ``,
        `Before we discuss your account, please reply with:`,
        `1) Your full name`,
        `2) Your date of birth (MM/DD/YYYY)`,
        ``,
        `Example: "${DEMO_EXPECTED_FULL_NAME}, ${DEMO_EXPECTED_DOB}"`,
      ].join("\n"),
    };

    // Note: device changes on next render; so we set messages in an effect below too.
    setMessages([introMsg]);
  }

  // Initialize on mount, and also whenever deviceIndex changes.
  useEffect(() => {
    if (didInitRef.current) {
      // device cycling triggers re-init
      const introMsg: ChatMsg = {
        role: "assistant",
        content: [
          `Hi ${DEMO_PATIENT_FIRST_NAME} — this is your cardiac monitoring team.`,
          ``,
          DEVICE_TEMPLATES[deviceIndex].intro,
          ``,
          `Before we discuss your account, please reply with:`,
          `1) Your full name`,
          `2) Your date of birth (MM/DD/YYYY)`,
          ``,
          `Example: "${DEMO_EXPECTED_FULL_NAME}, ${DEMO_EXPECTED_DOB}"`,
        ].join("\n"),
      };
      setMessages([introMsg]);
      return;
    }

    didInitRef.current = true;

    const introMsg: ChatMsg = {
      role: "assistant",
      content: [
        `Hi ${DEMO_PATIENT_FIRST_NAME} — this is your cardiac monitoring team.`,
        ``,
        DEVICE_TEMPLATES[deviceIndex].intro,
        ``,
        `Before we discuss your account, please reply with:`,
        `1) Your full name`,
        `2) Your date of birth (MM/DD/YYYY)`,
        ``,
        `Example: "${DEMO_EXPECTED_FULL_NAME}, ${DEMO_EXPECTED_DOB}"`,
      ].join("\n"),
    };

    setMessages([introMsg]);
  }, [deviceIndex]);

  function appendMessage(msg: ChatMsg) {
    setMessages((prev) => [...prev, msg]);
  }

  function assistantSay(text: string) {
    appendMessage({ role: "assistant", content: text });
  }

  function verifyIdentityFromText(text: string) {
    // Allow one message to include both name and DOB, e.g. "Ashley Gibson, 05/05/1991"
    const dob = parseDobToMMDDYYYY(text);
    const maybeName = text
      .replace(/(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4}).*$/, "")
      .replace(/[,;]+/g, " ")
      .trim();

    const hasName = maybeName.length >= 3 && /[a-zA-Z]/.test(maybeName);
    const hasDob = dob !== null;

    if (hasName) setPendingName(maybeName);
    if (hasDob) setPendingDob(dob);

    const expectedName = normalizeName(DEMO_EXPECTED_FULL_NAME);
    const expectedDob = DEMO_EXPECTED_DOB;

    // Decide what’s still missing/incorrect
    const nameOk = hasName ? normalizeName(maybeName) === expectedName : pendingName ? normalizeName(pendingName) === expectedName : false;
    const dobOk = hasDob ? dob === expectedDob : pendingDob ? pendingDob === expectedDob : false;

    const missingName = !nameOk;
    const missingDob = !dobOk;

    if (!missingName && !missingDob) {
      setIsVerified(true);
      assistantSay(
        `Thanks, ${DEMO_EXPECTED_FULL_NAME}. I’ve verified your identity. Is now a good time for a quick 2–3 minute ${device.label} check to restore transmissions?`
      );
      return;
    }

    // Only ask for what’s missing/incorrect (NOT both again unless both are wrong)
    if (missingName && missingDob) {
      assistantSay(
        `Thanks — I couldn’t verify your identity yet. Please reply with your full name and date of birth in MM/DD/YYYY format.\n\nExample: "${DEMO_EXPECTED_FULL_NAME}, ${DEMO_EXPECTED_DOB}"`
      );
      return;
    }

    if (missingDob) {
      assistantSay(
        `Thanks — the date of birth you sent doesn’t match our records or isn’t in the right format. Please reply with your date of birth in MM/DD/YYYY format.`
      );
      return;
    }

    // missingName
    assistantSay(`Thanks — please confirm your full name (first + last).`);
  }

  async function sendToApi(conversation: ChatMsg[]) {
    // Optional: once verified + consented, let the model handle freeform troubleshooting.
    // We still keep a scripted backbone, but the model can answer questions.
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "device_agent",
          patientName: DEMO_PATIENT_FIRST_NAME,
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as { reply?: string };
      const reply = (data?.reply ?? "").trim();
      if (reply) appendMessage({ role: "assistant", content: reply });
    } catch (e) {
      console.error(e);
      appendMessage({
        role: "assistant",
        content: "Sorry — something went wrong on my side. Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const nextConversation: ChatMsg[] = [...messages, userMsg];

    setMessages(nextConversation);
    setInput("");

    // 1) Verification gate (SMS-friendly)
    if (!isVerified) {
      verifyIdentityFromText(text);
      return;
    }

    // 2) Consent gate
    if (!hasConsentedToTroubleshoot) {
      if (isYes(text)) {
        setHasConsentedToTroubleshoot(true);
        assistantSay(
          `Great — we’ll do a quick ${device.label} check. Please answer a few fast questions.`
        );
        // Start scripted checks
        assistantSay(device.quickChecks[0]);
      } else {
        assistantSay(
          `No problem. When you’re ready, reply “yes” and we’ll run a quick ${device.label} check. If this feels urgent, you can also call the clinic directly.`
        );
      }
      return;
    }

    // 3) Scripted checks first (simple, deterministic), then allow API freeform if needed
    const assistantMessages = nextConversation.filter((m) => m.role === "assistant").length;

    // After consent, we asked intro + first check question; so we can step through quickChecks
    // Use a lightweight counter based on how many assistant "question" messages we've sent since consent.
    // This is intentionally simple for the POC.
    const askedCount = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .filter((c) => device.quickChecks.some((q) => c.includes(q))).length;

    const nextIndex = askedCount; // 0-based
    const nextQuestion = device.quickChecks[nextIndex + 1];

    if (nextQuestion) {
      assistantSay(nextQuestion);
      return;
    }

    // If we’ve exhausted scripted checks, hand off to the model for next-best guidance
    await sendToApi(nextConversation);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Device Help — {DEMO_PATIENT_FIRST_NAME} ({device.label})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDeviceIndex((i) => (i + 1) % DEVICE_TEMPLATES.length)}
          className="text-sm underline"
        >
          Reset (next device)
        </button>
      </div>

      <div className="mt-4 flex h-[70vh] flex-col rounded-md border">
        <div className="flex-1 overflow-auto p-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`mb-3 whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto w-fit max-w-[85%] bg-black text-white"
                  : "mr-auto w-fit max-w-[85%] bg-muted"
              }`}
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="mr-auto w-fit max-w-[85%] rounded-md bg-muted px-3 py-2 text-sm">
              …
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              placeholder="Type your response…"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
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
