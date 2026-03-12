import { type NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const MODEL = "gemini-3.1-flash-lite-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const PROMPT = `You are an expert analyst. Below are multiple video-feedback transcripts from attendees of a session.
Write a concise 2–4 sentence executive summary covering: the overall sentiment, recurring themes, top praise, and top concern.
Write in third person, professional tone. Output plain text only — no markdown, no bullet points.`;

async function summarizeTranscripts(transcripts: string[]): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || transcripts.length === 0) return null;

  const combined = transcripts
    .map((t, i) => `[Attendee ${i + 1}]: ${t.trim()}`)
    .join("\n\n");

  const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: "user", parts: [{ text: combined }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

export async function POST(request: NextRequest) {
  let body: { session_id?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { session_id } = body;
  if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("host_id")
    .eq("id", session_id)
    .single();

  if (!session || session.host_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: responses } = await supabase
    .from("responses")
    .select("transcript")
    .eq("session_id", session_id)
    .not("transcript", "is", null);

  const transcripts = (responses ?? []).map((r) => r.transcript as string).filter(Boolean);
  if (transcripts.length === 0)
    return NextResponse.json({ error: "No transcripts available to summarize" }, { status: 422 });

  const summary = await summarizeTranscripts(transcripts);
  if (!summary)
    return NextResponse.json({ error: "AI summary failed. Try again." }, { status: 502 });

  return NextResponse.json({ summary });
}
