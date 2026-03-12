import { type NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEEPGRAM_SPEAK = "https://api.deepgram.com/v1/speak";
const TTS_MODEL = "aura-asteria-en";

function buildFallback(name: string, sessionTitle: string, questions: string[]): string {
  const qPart =
    questions.length > 0
      ? ` I'll ask about: ${questions.slice(0, 2).join(", and ")}${questions.length > 2 ? ", and a bit more" : ""}.`
      : "";
  return `Hi ${name}, thanks for taking the time. This is the feedback session for ${sessionTitle}.${qPart} Get comfortable, and hit the button below when you're ready.`;
}

async function generateIntroText(
  name: string,
  sessionTitle: string,
  questions: string[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return buildFallback(name, sessionTitle, questions);

  const prompt = `Write a warm, natural 2–3 sentence spoken greeting for a video feedback session.
Person's name: ${name}
Session title: ${sessionTitle}
Questions they'll cover: ${questions.slice(0, 3).join("; ") || "general impressions"}

Rules:
- Sound like a real person, not a bot
- Under 55 words total
- No "Great!" or "Amazing!" filler
- Don't mention AI or transcription
- End by saying you're ready when they are
- Plain text only`;

  try {
    const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 100 },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return buildFallback(name, sessionTitle, questions);
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? buildFallback(name, sessionTitle, questions);
  } catch {
    return buildFallback(name, sessionTitle, questions);
  }
}

async function toSpeech(text: string): Promise<string | null> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${DEEPGRAM_SPEAK}?model=${TTS_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:audio/mp3;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: { name?: string; sessionTitle?: string; questions?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name = "there", sessionTitle = "this session", questions = [] } = body;

  const text = await generateIntroText(name, sessionTitle, questions);
  const audioDataUrl = await toSpeech(text);

  return NextResponse.json({ text, audioDataUrl });
}
