import OpenAI from "openai";

export const runtime = "nodejs";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
};

// In-memory (fast prototype). All users share the same “patient context”
// but the name is captured per server instance.
let patientName: string | null = null;

function buildPatientContext(name: string) {
  return `
You are a heart failure medication-check assistant. This is a prototype and not medical advice.

Patient name: ${name}
Diagnosis: Heart failure with reduced ejection fraction (HFrEF)

Current medications (known to you):
GDMT:
- Losartan 50 mg daily
- Metoprolol succinate 50 mg daily
- Spironolactone 25 mg daily
- Dapagliflozin 10 mg daily

Other medications:
- Atorvastatin 40 mg nightly
- Furosemide 20 mg PRN
- Aspirin 81 mg daily

Care timeline (known to you):
- Last cardiology visit: 8 days ago
- Purpose today: Day 8 post-titration medication check
- Next scheduled visit: in 3 weeks

Behavior rules:
- Do NOT ask the patient to restate their medication list; you already know it.
- If the patient asks “what medications am I taking?” answer directly using the list above.
- You may ask adherence/timing/missed doses/side effects questions one medication at a time.
- Keep responses concise and conversational.
- If the patient describes emergency symptoms, instruct them to call 911.
`;
}

function extractNameFromText(text: string): string | null {
  const t = text.trim();

  // common patterns
  const m1 = t.match(/\bmy name is\s+([a-zA-Z'-]{2,})\b/i);
  if (m1) return m1[1];

  const m2 = t.match(/\bi'm\s+([a-zA-Z'-]{2,})\b/i);
  if (m2) return m2[1];

  const m3 = t.match(/\bi am\s+([a-zA-Z'-]{2,})\b/i);
  if (m3) return m3[1];

  // if they just typed a single token like "Ashley"
  if (/^[a-zA-Z'-]{2,}$/.test(t)) return t;

  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      mode?: string;
      messages?: ChatMsg[];
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];

    // Ask for name if we don't have it yet
    if (!patientName) {
      // Try to capture name from the last user message if present
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const maybeName = lastUser ? extractNameFromText(lastUser.content) : null;

      if (maybeName) {
        patientName = maybeName;
        return Response.json({
          reply: `Thanks, ${patientName}. Before we start, I’ll do a quick Day 8 post-titration medication check. Are you taking losartan as intended? If yes: what time of day do you take it, and did you miss any doses in the past 7 days?`,
        });
      }

      return Response.json({
        reply: "Before we begin, what’s your first name?",
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: buildPatientContext(patientName) },
        ...messages,
      ],
      temperature: 0.2,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ??
      "Sorry — I didn’t get a response. Please try again.";

    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json(
      { reply: "Sorry — something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
