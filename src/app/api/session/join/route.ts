import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { session_id?: string; name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const sessionId = body.session_id?.trim();
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!sessionId || !name || !email) {
    return NextResponse.json({ error: "session_id, name and email are required" }, { status: 400 });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: "This session is not accepting feedback right now." },
      { status: 422 }
    );
  }

  const { data: existingAttendee } = await supabase
    .from("attendees")
    .select("id, unique_token, name")
    .eq("session_id", sessionId)
    .eq("email", email)
    .maybeSingle();

  if (existingAttendee?.unique_token) {
    if (existingAttendee.name !== name) {
      await supabase.from("attendees").update({ name }).eq("id", existingAttendee.id);
    }

    return NextResponse.json({
      token: existingAttendee.unique_token,
      redirect_to: `/session/${existingAttendee.unique_token}`,
      reused: true,
    });
  }

  const { data: created, error: createErr } = await supabase
    .from("attendees")
    .insert({
      session_id: sessionId,
      name,
      email,
    })
    .select("unique_token")
    .single();

  if (createErr || !created?.unique_token) {
    return NextResponse.json(
      { error: createErr?.message ?? "Could not create attendee" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token: created.unique_token,
    redirect_to: `/session/${created.unique_token}`,
    reused: false,
  });
}
