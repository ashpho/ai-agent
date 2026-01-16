"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  loading = false,
  placeholder,
}: Props) {
  return (
    <div className="mt-4 flex gap-2">
      <input
        className="flex-1 rounded-md border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={loading}
      />
      <button
        onClick={onSend}
        disabled={loading}
        className="rounded-md border px-3 py-2 text-sm"
      >
        Send
      </button>
    </div>
  );
}

export default ChatInput;
