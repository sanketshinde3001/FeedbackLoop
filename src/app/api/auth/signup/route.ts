import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const supabase = await createClient();

  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm_password") as string | null;

  if (!email || !password || !confirm) {
    return NextResponse.redirect(
      new URL("/admin/login?mode=signup&error=All+fields+are+required", request.url),
      { status: 303 }
    );
  }

  if (password !== confirm) {
    return NextResponse.redirect(
      new URL("/admin/login?mode=signup&error=Passwords+do+not+match", request.url),
      { status: 303 }
    );
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      new URL("/admin/login?mode=signup&error=Password+must+be+at+least+8+characters", request.url),
      { status: 303 }
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/auth/callback`,
    },
  });

  if (error) {
    const msg = encodeURIComponent(error.message);
    return NextResponse.redirect(
      new URL(`/admin/login?mode=signup&error=${msg}`, request.url),
      { status: 303 }
    );
  }

  // If Supabase auto-confirmed the user (email confirmation disabled), session exists
  if (data.session) {
    return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  }

  // Email confirmation required — tell the user to check their inbox
  return NextResponse.redirect(
    new URL("/admin/login?success=Check+your+email+to+confirm+your+account", request.url),
    { status: 303 }
  );
}
