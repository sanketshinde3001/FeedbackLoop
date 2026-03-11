import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens back onto the request so subsequent
          // server-side reads within this request see the new values.
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          );
          // Re-create supabaseResponse so it carries the new cookies.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add any logic between createServerClient and getUser().
  // getUser() may call setAll() above to refresh tokens; any redirect must
  // carry those refreshed cookies or the browser will loop.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper: redirect while preserving Supabase session cookies
  function redirectWithCookies(pathname: string) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const res = NextResponse.redirect(url);
    // Copy every cookie that Supabase wrote (refreshed tokens, etc.)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
    return res;
  }

  // Protect all /admin routes — send unauthenticated visitors to login
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login")
  ) {
    return redirectWithCookies("/admin/login");
  }

  // Logged-in admin visiting /admin/login → send to dashboard
  if (user && request.nextUrl.pathname === "/admin/login") {
    return redirectWithCookies("/admin");
  }

  return supabaseResponse;
}

export const config = {
  // Only run middleware on routes that actually need auth checks.
  // API routes and public session pages are handled in their own route handlers.
  matcher: ["/admin/:path*"],
};
