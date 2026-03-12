import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { transcribeVideoUrl } from "@/lib/deepgram";
import { analyzeTranscript } from "@/lib/gemini";
import { sendThankYouEmail } from "@/lib/email";
import type { EmojiType, SentimentType } from "@/lib/supabase/types";

// POST /api/session/submit
// Body: { token: string, emoji_type?: string, video_url?: string }
// Uses service-role client — attendees are not Supabase auth users.
export async function POST(request: NextRequest) {
  let body: { token?: string; emoji_type?: string; video_url?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, emoji_type, video_url } = body;

  // Validate token format before hitting DB
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const VALID_EMOJIS = ["loved_it", "helpful", "needs_improvement", "confused"];
  if (emoji_type && !VALID_EMOJIS.includes(emoji_type)) {
    return NextResponse.json({ error: "Invalid emoji type" }, { status: 400 });
  }

  // Validate video_url if provided — must be an https URL (Cloudinary)
  if (video_url !== undefined && video_url !== null) {
    try {
      const parsed = new URL(video_url);
      if (parsed.protocol !== "https:") {
        return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();

  // Resolve token → attendee (validates session is still active)
  const { data: rows, error: rpcError } = await supabase.rpc(
    "validate_attendee_token",
    { p_token: token }
  );

  if (rpcError || !rows || rows.length === 0) {
    return NextResponse.json(
      { error: "Token not found or session is not active" },
      { status: 404 }
    );
  }

  const { attendee_id, session_id, submitted_at } = rows[0];

  // Prevent double submission
  if (submitted_at) {
    return NextResponse.json(
      { error: "Feedback already submitted" },
      { status: 409 }
    );
  }

  // Save emoji reaction if provided
  if (emoji_type) {
    const { error: reactionErr } = await supabase.from("reactions").upsert(
      { attendee_id, session_id, emoji_type: emoji_type as EmojiType },
      { onConflict: "attendee_id,session_id", ignoreDuplicates: false }
    );
    if (reactionErr) {
      return NextResponse.json({ error: reactionErr.message }, { status: 500 });
    }
  }

  // Get transcript from Deepgram (server-side, non-blocking on failure)
  let transcript: string | null = null;
  if (video_url) {
    transcript = await transcribeVideoUrl(video_url);
  }

  // Run Gemini sentiment on the transcript (non-blocking on failure)
  let sentiment: SentimentType | null = null;
  let sentiment_score: number | null = null;
  let ai_conclusion: string | null = null;
  if (transcript) {
    const result = await analyzeTranscript(transcript);
    if (result) {
      sentiment = result.sentiment;
      sentiment_score = result.score;
      ai_conclusion = result.conclusion;
    }
  }

  // Create a response row with video URL + transcript + sentiment
  const { error: responseErr } = await supabase.from("responses").upsert(
    {
      attendee_id,
      session_id,
      video_url: video_url ?? null,
      transcript,
      sentiment,
      sentiment_score,
      ai_conclusion,
      approved_for_wall: false,
    },
    { onConflict: "attendee_id,session_id", ignoreDuplicates: false }
  );
  if (responseErr) {
    return NextResponse.json({ error: responseErr.message }, { status: 500 });
  }

  // Mark attendee as submitted
  const { error: updateErr } = await supabase
    .from("attendees")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", attendee_id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send thank-you email (fire-and-forget)
  const { data: attendeeRow } = await supabase
    .from("attendees")
    .select("name, email")
    .eq("id", attendee_id)
    .single();

  const sessionTitle = rows[0].session_title as string;

  if (attendeeRow) {
    sendThankYouEmail({
      to: attendeeRow.email,
      name: attendeeRow.name,
      sessionTitle,
    }).catch(() => null);
  }

  return NextResponse.json({ success: true });
}
