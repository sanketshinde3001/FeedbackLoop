import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

// GET /api/auth/callback
// Handles Supabase email confirmation & OAuth redirects
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);
    const supabase = createRouteHandlerClient(request, redirectResponse);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectResponse;
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=Auth+failed`);
}
