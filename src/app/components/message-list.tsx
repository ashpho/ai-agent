"use client";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: Message[];
};

export function MessageList({ messages }: Props) {
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      {messages.map((m, i) => (
        <div key={i}>
          <strong>{m.role === "user" ? "You" : "Assistant"}:</strong>{" "}
          {m.content}
        </div>
      ))}
    </div>
  );
}

export default MessageList;
