"use client";

type Props = {
  title: string;
  subtitle?: string;
};

export function ChatHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export default ChatHeader;
