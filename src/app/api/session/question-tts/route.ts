import { type NextRequest, NextResponse } from "next/server";

const DEEPGRAM_SPEAK = "https://api.deepgram.com/v1/speak";
const TTS_MODEL = "aura-asteria-en";

export async function POST(request: NextRequest) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TTS service not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${DEEPGRAM_SPEAK}?model=${TTS_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to synthesize question audio" }, { status: 502 });
    }

    const audioBuffer = await res.arrayBuffer();
    const audioDataUrl = `data:audio/mp3;base64,${Buffer.from(audioBuffer).toString("base64")}`;
    return NextResponse.json({ audioDataUrl });
  } catch {
    return NextResponse.json({ error: "TTS service unavailable" }, { status: 502 });
  }
}
