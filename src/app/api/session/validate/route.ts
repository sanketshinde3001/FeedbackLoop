import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/session/validate?token=xxx
// Used by the public session page to validate an attendee token
// Uses service role to bypass RLS (attendees have no auth session)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("validate_attendee_token", {
    p_token: token,
  });

  if (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Token not found or session is not active" },
      { status: 404 }
    );
  }

  return NextResponse.json(data[0]);
}
