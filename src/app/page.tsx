"use client";

import * as React from "react";
import { SymptomCheckerChat } from "@/app/components/symptom-checker-chat";
import { MedCheckChat } from "@/app/components/med-check-chat";

export default function Home() {
  const [mode, setMode] = React.useState<"symptoms" | "meds">("symptoms");

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
