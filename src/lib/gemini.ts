export type GeminiResult = {
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  conclusion: string;
};

const MODEL = "gemini-3.1-flash-lite-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are an expert feedback analyst engine. Analyze the attendee feedback transcript and output ONLY a valid JSON object — no markdown, no explanation, no wrapping text.

Required format (exact):
{"sentiment":"positive","score":0.85,"conclusion":"The attendee found the session highly valuable and praised the practical examples."}

Strict rules:
- sentiment: must be exactly "positive", "neutral", or "negative" based on the overall emotional tone
- score: decimal number from -1.0 to +1.0 — positive maps to 0.01–1.0, neutral to -0.10–0.10, negative to -1.0–-0.01
- conclusion: 1–2 complete sentences written in third-person capturing the core takeaway. Be specific. Reference actual content mentioned.
- ANY deviation from this format is a critical failure. Output ONLY the JSON object.`;

async function callGemini(transcript: string, apiKey: string): Promise<GeminiResult | null> {
  const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `Transcript:\n${transcript.trim()}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) return null;

  const parsed = JSON.parse(raw) as { sentiment?: unknown; score?: unknown; conclusion?: unknown };

  const validSentiments = ["positive", "neutral", "negative"] as const;
  if (!validSentiments.includes(parsed.sentiment as (typeof validSentiments)[number])) return null;

  const score = Number(parsed.score);
  if (isNaN(score) || score < -1 || score > 1) return null;

  if (typeof parsed.conclusion !== "string" || !parsed.conclusion.trim()) return null;

  return {
    sentiment: parsed.sentiment as GeminiResult["sentiment"],
    score: Math.round(score * 1000) / 1000,
    conclusion: parsed.conclusion.trim().slice(0, 500),
  };
}

export async function analyzeTranscript(transcript: string | null): Promise<GeminiResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !transcript || transcript.trim().length < 10) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
    try {
      const result = await callGemini(transcript, apiKey);
      if (result) return result;
    } catch {
      // next attempt
    }
  }
  return null;
}
