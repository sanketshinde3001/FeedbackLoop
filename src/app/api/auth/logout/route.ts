import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();
  return redirectResponse;
}
