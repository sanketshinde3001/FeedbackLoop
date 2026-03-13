import { type NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { response_id?: string; approved: boolean; wall_video_source?: "raw" | "edited" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { response_id, approved } = body;
  const wallVideoSource = body.wall_video_source;
  if (!response_id || typeof approved !== "boolean") {
    return NextResponse.json({ error: "response_id and approved required" }, { status: 400 });
  }
  if (wallVideoSource && wallVideoSource !== "edited") {
    return NextResponse.json({ error: "Invalid wall_video_source" }, { status: 400 });
  }

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: response } = await supabase
    .from("responses")
    .select("*")
    .eq("id", response_id)
    .single();

  if (!response) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: session } = await supabase
    .from("sessions")
    .select("host_id")
    .eq("id", response.session_id)
    .single();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (approved && wallVideoSource === "edited" && !response.edited_video_url) {
    return NextResponse.json(
      { error: "Edited video is not ready yet. Click Edit it first." },
      { status: 422 }
    );
  }

  const payload: { approved_for_wall: boolean; wall_video_source?: "edited" } = {
    approved_for_wall: approved,
  };
  if (approved && wallVideoSource === "edited") {
    payload.wall_video_source = "edited";
  }

  const { error: updateErr } = await supabase
    .from("responses")
    .update(payload)
    .eq("id", response_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ approved, wall_video_source: wallVideoSource ?? "raw" });
}
