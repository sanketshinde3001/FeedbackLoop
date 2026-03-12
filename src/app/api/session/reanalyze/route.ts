import { type NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { transcribeVideoUrl } from "@/lib/deepgram";
import { analyzeTranscript } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  let body: { response_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { response_id } = body;
  if (!response_id || typeof response_id !== "string") {
    return NextResponse.json({ error: "Missing response_id" }, { status: 400 });
  }

  // Verify caller is an authenticated admin
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: response, error: fetchErr } = await supabase
    .from("responses")
    .select("id, video_url, transcript, session_id")
    .eq("id", response_id)
    .single();

  if (fetchErr || !response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  // Ownership check
  const { data: session } = await supabase
    .from("sessions")
    .select("host_id")
    .eq("id", response.session_id)
    .single();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Run Deepgram if video exists but no transcript yet
  let transcript = response.transcript;
  if (!transcript && response.video_url) {
    transcript = await transcribeVideoUrl(response.video_url);
  }

  if (!transcript) {
    return NextResponse.json(
      { error: "No transcript available — video may still be processing or was not uploaded." },
      { status: 422 }
    );
  }

  const result = await analyzeTranscript(transcript);
  if (!result) {
    return NextResponse.json({ error: "AI analysis failed. Please try again." }, { status: 502 });
  }

  await supabase
    .from("responses")
    .update({
      transcript,
      sentiment: result.sentiment,
      sentiment_score: result.score,
      ai_conclusion: result.conclusion,
    })
    .eq("id", response_id);

  return NextResponse.json({
    sentiment: result.sentiment,
    sentiment_score: result.score,
    ai_conclusion: result.conclusion,
    transcript,
  });
}
