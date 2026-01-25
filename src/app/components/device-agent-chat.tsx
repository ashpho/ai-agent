"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = { role: Role; content: string };

const LS_KEY = "rs_poc_patient_name_device_agent_v1";

export default function DeviceAgentChat() {
  const [patientName, setPatientName] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);

  // prevent double kickoff in React StrictMode/dev
  const didKickoffRef = useRef(false);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

    if (saved) {
      setPatientName(saved);
      // show a lightweight placeholder while we fetch the proactive outreach message
      setMessages([
        {
          role: "assistant",
          content: `Hi ${saved} — one moment while I pull up the device check-in...`,
        },
      ]);
    } else {
      setMessages([
        {
          role: "assistant",
          content: "Hi there — before we get started, what’s your first name?",
        },
      ]);
    }
  }, []);

  // Kick off proactive outreach as soon as we have a name (and only once)
  useEffect(() => {
    if (!p
