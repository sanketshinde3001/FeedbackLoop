import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

// GET /auth/callback
// Handles email confirmation and magic link redirects from Supabase
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/admin";

  if (code) {
    const redirectResponse = NextResponse.redirect(new URL(next, request.url));
    const supabase = createRouteHandlerClient(request, redirectResponse);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectResponse;
    }
  }

  // If no code or error, redirect to login with error
  return NextResponse.redirect(
    new URL("/admin/login?error=Could+not+authenticate", request.url)
  );
}
