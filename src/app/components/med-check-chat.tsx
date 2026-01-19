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
  return cleaned.split(/\s+/)[0].replace(/[^\p{L}\p{N}'-]/gu, "");
}

export default function MedCheckChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [patientName, setPatientName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(NAME_KEY);
    if (saved) {
      setPatientName(saved);
      setMessages([
        {
          role: "assistant",
          content: `Welcome back, ${saved}. Ready to continue your medication check?`,
        },
      ]);
    } else {
      setMessages([{ role: "assistant", content: "Hi — what’s your first name?" }]);
    }
  }, []);

  async function callChatApi(nextMessages: Message[], name: string) {
    const payload = {
      mode: "med_check",
      patientName: name,
      messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
    };

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    // API returns { reply: string }
    const assistantText: string = data?.reply ?? "";
    return assistantText;
  }

  async function startFromPrompt(name: string) {
    setLoading(true);
    try {
      const kickoff: Message = {
        role: "user",
        content:
          "Begin the medication check now. Follow the prompt’s rules and ask the first question.",
      };

      const assistantText = await callChatApi([kickoff], name);

      setMessages([
        {
          role: "assistant",
          content: assistantText || "Let’s get started.",
        },
      ]);
    } catch {
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

    // Name gate
    if (!patientName) {
      // echo user message into transcript
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

      const name = firstTokenName(trimmed);
      if (!name) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry — I didn’t catch that. What’s your first name?" },
        ]);
        return;
      }

      if (typeof window !== "undefined") window.localStorage.setItem(NAME_KEY, name);
      setPatientName(name);

      await startFromPrompt(name);
      return;
    }

    // Normal flow
    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];

    setLoading(true);
    setMessages(nextMessages);

    try {
      const assistantText = await callChatApi(nextMessages, patientName);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText || "Got it." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I’m having trouble right now. Please try again in a moment." },
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
        <div className="text-sm">{patientName ? `Med Check – ${patientName}` : "Med Check"}</div>
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
        {loading ? <div className="mt-3 text-sm opacity-70">Typing…</div> : null}
      </div>

      <div className="border-t p-3">
        <ChatInput onSend={onSend} disabled={loading} />
      </div>
    </div>
  );
}
