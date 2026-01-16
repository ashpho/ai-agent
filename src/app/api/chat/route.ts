import OpenAI from "openai";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function loadPrompt(relPath: string) {
  const fullPath = path.join(process.cwd(), relPath);
  return fs.readFile(fullPath, "utf8");
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const system = await loadPrompt("prompts/hf_symptom_check/system.md");
    const intake = await loadPrompt("prompts/hf_symptom_check/intake.md");
    const version = await loadPrompt("prompts/hf_symptom_check/version.txt");

    const finalMessages = [
      {
        role: "system",
        content: `${system}\n\nPROMPT_VERSION: ${version.trim()}\n\nINTAKE_RULES:\n${intake}`,
      },
      ...(messages ?? []),
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: finalMessages,
    });

    return NextResponse.json({
      reply: response.choices?.[0]?.message?.content ?? "",
      promptVersion: version.trim(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
