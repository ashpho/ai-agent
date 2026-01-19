"use client";

import React, { useState } from "react";

type Props = {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your message…",
}: Props) {
  const [value, setValue] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    setValue("");
    await onSend(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="submit"
        className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  );
}
