import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

// POST /api/auth/logout
// The redirect response must be created FIRST, then the Supabase client
// writes its cleared auth cookies directly onto that response.
// If we created the response after signOut, the cleared cookies would be
// lost and the browser would keep the stale token → redirect loop.
export async function POST(request: NextRequest) {
  const redirectResponse = NextResponse.redirect(
    new URL("/admin/login", request.url),
    { status: 303 }
  );

  const supabase = createRouteHandlerClient(request, redirectResponse);

  await supabase.auth.signOut();
  return redirectResponse;
}
