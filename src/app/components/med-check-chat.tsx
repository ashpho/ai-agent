"use client";

import * as React from "react";
import AlertBanner from "./alert-banner";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function MedCheckChat() {
  const [dismissed, setDismissed] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([
    {
      id: uid(),
      role: "assistant",
      createdAt: Date.now(),
      content:
        "Hi — I’m going to do a quick Day 8 post-titration medication check. I’ll confirm each medication on your plan and note any discrepancies.\n\nTo start: are you taking **losartan (Cozaar)** as intended? If yes: what time of day do you take it, and did you miss any doses in the past 7 days?",
    },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMsg = {
      id: uid(),
      role: "user",
      createdAt: Date.now(),
      content: trimmed,
    };

    const next = [...messages, userMsg];
    setMessages(next);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "med_check",
          // API expects system/user/assistant roles; we send only conversation turns
          messages: next.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`Bad response: ${res.status}`);

      const data = (await res.json()) as { reply?: string; error?: string };

      const assistantText =
        (data.reply ?? "").trim() || "Sorry — I didn’t get a response. Try again.";

      const assistantMsg: ChatMsg = {
        id: uid(),
        role: "assistant",
        createdAt: Date.now(),
        content: assistantText,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          createdAt: Date.now(),
          content:
            "Something went wrong calling the chat service. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      {!dismissed && <AlertBanner onDismiss={() => setDismissed(true)} />}

      <div className="mt-4 rounded-xl border bg-background">
        <ChatHeader
          title="GDMT Med Check"
          subtitle="Day 8 post-titration medication reconciliation (POC)"
        />

        <MessageList
          messages={messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))}
          isLoading={isLoading}
        />

        <div className="border-t p-3">
          <ChatInput
            placeholder="Type your answer…"
            onSend={sendMessage}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
