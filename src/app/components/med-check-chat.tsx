"use client";

import React, { useEffect, useState } from "react";
import ChatInput from "@/app/components/chat-input";
import MessageList from "@/app/components/message-list";

type Role = "user" | "assistant" | "system";

type Message = {
  role: Role;
  content: string;
};

const NAME_KEY = "medcheck_patient_name";

function firstTokenName(input: string) {
  const cleaned = (input || "").trim();
  if (!cleaned) return "";
  // take first token, strip punctuation
  return cleaned.split(/\s+/)[0].replace(/[^\p{L}\p{N}'-]/gu, "");
}

export default function MedCheckChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [patientName, setPatientName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // On mount, try to restore name
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(NAME_KEY);
    if (saved) {
      setPatientName(saved);
      // Kick off the conversation from the prompt once name exists
      void startFromPrompt(saved);
    } else {
      // Ask for name first
      setMessages([
        {
          role: "assistant",
          content: "Hi — what’s your first name?",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startFromPrompt(name: string) {
    // Do NOT hardcode the med-check script here.
    // We call the API and let prompts/med_check/* drive the opening + first question.
    setLoading(true);
    try {
      const payload = {
        mode: "med_check",
        patientName: name,
        // Hidden kickoff message (not shown in UI) so the model starts cleanly
        messages: [
          {
            role: "user",
            content: "Start the Day 8 medication check now.",
          },
        ] as Message[],
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const assistantText =
        data?.message?.content ??
        data?.message ??
        data?.content ??
        data?.text ??
        "";

      setMessages([
        {
          role: "assistant",
          content:
            assistantText ||
            "Thanks. Let’s get started. (I couldn’t load the scripted prompt response.)",
        },
      ]);
    } catch (e) {
      setMessages([
        {
          role: "assistant",
          content:
            "I’m having trouble loading the medication check right now. Please refresh and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onSend(userMsg: string) {
    const trimmed = (userMsg || "").trim();
    if (!trimmed) return;

    // 1) Name gate: first user response becomes the name (no API call yet)
    if (!patientName) {
      const name = firstTokenName(trimmed);
      if (!name) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: trimmed },
          {
            role: "assistant",
            content: "Sorry — I didn’t catch that. What’s your first name?",
          },
        ]);
        return;
      }

      if (typeof window !== "undefined") window.localStorage.setItem(NAME_KEY, name);
      setPatientName(name);

      // Show the user’s name entry, then start the AI-driven med check from prompts
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

      await startFromPrompt(name);
      return;
    }

    // 2) Normal flow: call /api/chat with mode=med_check and existing message history
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const payload = {
        mode: "med_check",
        patientName,
        // send full visible history
        messages: [...messages, { role: "user", content: trimmed }].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const assistantText =
        data?.message?.content ??
        data?.message ??
        data?.content ??
        data?.text ??
        "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantText || "Got it.",
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I’m having trouble right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onReset() {
    if (typeof window !== "undefined") window.localStorage.removeItem(NAME_KEY);
    setPatientName("");
    setMessages([{ role: "assistant", content: "Hi — what’s your first name?" }]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm">
          {patientName ? `Med Check – ${patientName}` : "Med Check"}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs underline opacity-80 hover:opacity-100"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
        {loading ? (
          <div className="mt-3 text-sm opacity-70">Typing…</div>
        ) : null}
      </div>

      <div className="border-t p-3">
        <ChatInput onSend={onSend} disabled={loading} />
      </div>
    </div>
  );
}
