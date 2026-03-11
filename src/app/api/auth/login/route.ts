import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/login
// Handles login form submission (no JS required)
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/admin/login?error=Missing+credentials", request.url),
      { status: 303 }
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(
      new URL("/admin/login?error=Invalid+email+or+password", request.url),
      { status: 303 }
    );
  }

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
