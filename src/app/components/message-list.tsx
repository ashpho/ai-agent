"use client";

import React from "react";

type Role = "user" | "assistant" | "system";

export type Message = {
  role: Role;
  content: string;
};

type Props = {
  messages: Message[];
};

export default function MessageList({ messages }: Props) {
  return (
    <div className="space-y-3">
      {messages.map((m, idx) => {
        const isUser = m.role === "user";
        const isSystem = m.role === "system";

        // Hide system messages from the UI (optional, but usually desired)
        if (isSystem) return null;

        return (
          <div
            key={idx}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                isUser
                  ? "bg-black text-white"
                  : "bg-neutral-100 text-neutral-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
