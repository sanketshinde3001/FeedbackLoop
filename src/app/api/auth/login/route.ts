import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

// POST /api/auth/login
// Handles login form submission (no JS required)
export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/admin/login?error=Missing+credentials", request.url),
      { status: 303 }
    );
  }

  const redirectResponse = NextResponse.redirect(new URL("/admin", request.url), {
    status: 303,
  });
  const supabase = createRouteHandlerClient(request, redirectResponse);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(
      new URL("/admin/login?error=Invalid+email+or+password", request.url),
      { status: 303 }
    );
  }

  return redirectResponse;
}
