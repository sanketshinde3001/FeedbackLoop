import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { transcribeVideoUrlWithWords } from "@/lib/deepgram";
import { wordsToVtt } from "@/lib/captions";
import {
  buildEditedVideoUrl,
  getCloudinaryPublicIdFromUrl,
  uploadVttToCloudinary,
} from "@/lib/cloudinary-server";

export async function POST(request: NextRequest) {
  let body: { response_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const responseId = body.response_id;
  if (!responseId || typeof responseId !== "string") {
    return NextResponse.json({ error: "response_id is required" }, { status: 400 });
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: response } = await supabase
    .from("responses")
    .select("id, session_id, attendee_id, video_url")
    .eq("id", responseId)
    .single();

  if (!response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, host_id")
    .eq("id", response.session_id)
    .single();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!response.video_url) {
    return NextResponse.json({ error: "No raw video found for this response." }, { status: 422 });
  }

  const { data: attendee } = await supabase
    .from("attendees")
    .select("name")
    .eq("id", response.attendee_id)
    .single();

  const attendeeName = attendee?.name || "Attendee";

  const transcription = await transcribeVideoUrlWithWords(response.video_url);
  if (!transcription.success) {
    return NextResponse.json(
      { error: transcription.error || "Unable to generate transcript for this video." },
      { status: 422 }
    );
  }

  const words = transcription.words ?? [];
  if (!words.length) {
    return NextResponse.json(
      { error: "No timestamped transcript available to build captions." },
      { status: 422 }
    );
  }

  const videoPublicId = getCloudinaryPublicIdFromUrl(response.video_url);
  if (!videoPublicId) {
    return NextResponse.json(
      { error: "Unable to resolve Cloudinary video id from raw video URL." },
      { status: 422 }
    );
  }

  const vtt = wordsToVtt(words);
  const uploadedCaption = await uploadVttToCloudinary(vtt, response.id);
  if (!uploadedCaption) {
    return NextResponse.json(
      { error: "Failed to upload generated captions. Please try again." },
      { status: 502 }
    );
  }

  const editedVideoUrl = buildEditedVideoUrl({
    rawVideoPublicId: videoPublicId,
    captionPublicId: uploadedCaption.publicId,
    attendeeName,
  });

  if (!editedVideoUrl) {
    return NextResponse.json(
      { error: "Cloudinary is not configured for edited videos." },
      { status: 500 }
    );
  }

  const { error: updateErr } = await supabase
    .from("responses")
    .update({
      edited_video_url: editedVideoUrl,
      caption_vtt_url: uploadedCaption.secureUrl,
      transcript: transcription.transcript ?? null,
    })
    .eq("id", responseId);

  if (updateErr) {
    const isMissingColumn =
      updateErr.code === "42703" ||
      /column .* does not exist/i.test(updateErr.message);

    if (isMissingColumn) {
      return NextResponse.json(
        {
          error:
            "Database migration required: add edited_video_url, caption_vtt_url, wall_video_source columns to responses table.",
          details: updateErr.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Could not save edited video.",
        details: updateErr.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    edited_video_url: editedVideoUrl,
    caption_vtt_url: uploadedCaption.secureUrl,
    transcript: transcription.transcript,
    message: "Edited video is ready with captions and name overlay.",
  });
}
