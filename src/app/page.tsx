"use client";

import * as React from "react";
import { SymptomCheckerChat } from "./components/symptom-checker-chat";
import MedCheckChat from "./components/med-check-chat";
import DeviceAgentChat from "./components/device-agent-chat";

type Mode = "symptoms" | "meds" | "device";

export default function Home() {
  const [mode, setMode] = React.useState<Mode>("symptoms");

  return (
    <main className="p-4">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">AI-Agent POC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a flow, then validate the prompt text renders.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("symptoms")}
            className={`rounded-md px-3 py-2 text-sm border ${
              mode === "symptoms" ? "bg-black text-white" : "bg-white"
            }`}
          >
            Symptom Check
          </button>

          <button
            type="button"
            onClick={() => setMode("meds")}
            className={`rounded-md px-3 py-2 text-sm border ${
              mode === "meds" ? "bg-black text-white" : "bg-white"
            }`}
          >
            GDMT Med Check
          </button>

          <button
            type="button"
            onClick={() => setMode("device")}
            className={`rounded-md px-3 py-2 text-sm border ${
              mode === "device" ? "bg-black text-white" : "bg-white"
            }`}
          >
            Device Help
          </button>
        </div>

        <div className="mt-6">
          {mode === "symptoms" && <SymptomCheckerChat />}
          {mode === "meds" && <MedCheckChat />}
          {mode === "device" && <DeviceAgentChat />}
        </div>
      </div>
    </main>
  );
}
