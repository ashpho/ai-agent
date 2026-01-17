import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Mode = "hf_symptom_check" | "med_check";

function readPromptFile(mode: Mode, filename: string) {
  const filePath = path.join(process.cwd(), "prompts", mode, filename);
  return fs.readFileSync(filePath, "utf8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      mode,
      patientName,
    } = body as {
      messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      mode?: Mode;
      patientName?: string;
    };

    const resolvedMode: Mode = mode === "med_check" ? "med_check" : "hf_symptom_check";

    const system = readPromptFile(resolvedMode, "system.md");
    const intake = readPromptFile(resolvedMode, "intake.md");

    const nameLine = patientName?.trim()
      ? `\n\nPATIENT NAME: ${patientName.trim()}`
      : "";

    const promptHeader = `${system}${nameLine}\n\n${intake}`.trim();

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "system", content: promptHeader }, ...messages],
    });

    return new Response(
      JSON.stringify({
        reply: response.choices[0].message.content,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
}
