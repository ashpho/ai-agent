"use client";

import * as React from "react";

export function SymptomCheckerChat() {
  // Raj can edit this initial prompt directly.
  const initialPrompt =
    "Welcome to the Heart Failure Symptom Assessment Tool. Please describe any symptoms you are currently experiencing (shortness of breath, swelling, fatigue, chest discomfort) and when they started.";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Heart Failure Symptom Check</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Prompt stub for Raj. Symptom intake only.
      </p>

      <div className="mt-4 rounded-lg border bg-white p-4 text-sm leading-6 whitespace-pre-wrap">
        {initialPrompt}
      </div>
    </div>
  );
}

export default SymptomCheckerChat;
