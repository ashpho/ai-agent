"use client";

type Props = {
  onDismiss?: () => void;
};

export default function AlertBanner({ onDismiss }: Props) {
  return (
    <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
      <div className="flex items-start justify-between gap-3">
        <p>
          This is a prototype for testing prompt behavior only. It does not provide medical advice.
          If this is an emergency, call 911.
        </p>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-xs underline"
            aria-label="Dismiss disclaimer"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
