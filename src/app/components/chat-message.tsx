"use client";

type Props = {
  role: "user" | "assistant";
  content: string;
};

export function ChatMessage({ role, content }: Props) {
  return (
    <div className="text-sm">
      <strong>{role === "user" ? "You" : "Assistant"}:</strong> {content}
    </div>
  );
}

export default ChatMessage;
