"use client";

import * as React from "react";
import AlertBanner from "./alert-banner";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function MedCheckChat() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there — before we get started, what’s your first name?",
    },
  ]);

  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [patientName, setPatientName] = React.useState<string | null>(null);
  const [showBanner, setShowBanner] = React.useState(true);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // 🟡 STEP 1: Capture name
    if (!patientName) {
      const name = trimmed.split(" ")[0];
      setPatientName(name);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Thanks, ${name}. I’m going to walk through a quick Day 8 post-titration medication check with you. I’ll confirm each medication on your plan and note any discrepancies.`,
        },
        {
          role: "assistant",
          content:
            "Let’s start with your ARB.\n\nAre you currently taking **losartan (Cozaar)** as prescribed? If yes, what time of day do you usually take it, and did you miss any doses in the past 7 days?",
        },
      ]);

      setLoading(false);
      return;
    }

    // 🟢 STEP 2: Normal chat flow (OpenAI)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "med_check",
          patientName,
          messages: [...messages, userMessage],
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? "Sorry — something went wrong. Please try again.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry — I ran into an issue. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      {showBanner && (
        <AlertBanner onDismiss={() => setShowBanner(false)} />
      )}

      <div className="mt-4 rounded-xl border bg-background">
        <ChatHeader
          title="GDMT Medication Check"
          subtitle="Day 8 post-titration medication reconciliation (POC)"
        />

        <MessageList messages={messages} isLoading={loading} />

        <div className="border-t p-3">
          <ChatInput
            placeholder="Type your response…"
            onSend={sendMessage}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
