import { type NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { response_id?: string; approved: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { response_id, approved } = body;
  if (!response_id || typeof approved !== "boolean") {
    return NextResponse.json({ error: "response_id and approved required" }, { status: 400 });
  }

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: response } = await supabase
    .from("responses")
    .select("session_id")
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

  await supabase
    .from("responses")
    .update({ approved_for_wall: approved })
    .eq("id", response_id);

  return NextResponse.json({ approved });
}
