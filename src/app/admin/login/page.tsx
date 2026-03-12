import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import { AuthForm } from "@/components/admin/AuthForm";

const serif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = { title: "Login — FeedbackLoop" };

interface Props {
  searchParams: Promise<{ error?: string; success?: string; mode?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, success, mode } = await searchParams;
  const defaultMode = mode === "signup" ? "signup" : "login";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-14 py-5 border-b border-stone-300">
        <Link href="/" className={`${serif.className} text-lg tracking-tight`}>
          FeedbackLoop
        </Link>
      </nav>

      {/* Main */}
      <div className="flex min-h-[calc(100vh-61px)] flex-col sm:flex-row">
        {/* Left — brand panel */}
        <div className="hidden sm:flex sm:w-[45%] border-r border-stone-300 flex-col justify-between px-14 py-20">
          <div className="space-y-6">
            <p className="font-mono text-[10px] text-stone-400 tracking-[0.25em] uppercase">
              Admin portal
            </p>
            <h1
              className={`${serif.className} text-[clamp(2.4rem,4vw,4rem)] leading-[1.08] tracking-tight max-w-sm`}
            >
              {defaultMode === "signup"
                ? <>Start listening to the people in the room.</>  
                : <>Welcome back.<br /><span className="italic">Your sessions are waiting.</span></>}
            </h1>
          </div>
          <div className="space-y-1">
            <div className="w-6 border-t border-stone-400" />
            <p className="text-[11px] font-mono text-stone-400 uppercase tracking-widest">
              FeedbackLoop &mdash; 2026
            </p>
          </div>
        </div>

        {/* Right — form panel */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 sm:px-16">
          {/* Mobile-only heading */}
          <div className="w-full max-w-sm mb-10 sm:hidden">
            <p className="font-mono text-[10px] text-stone-400 tracking-[0.25em] uppercase mb-3">
              Admin portal
            </p>
            <h1 className={`${serif.className} text-4xl tracking-tight leading-tight`}>
              {defaultMode === "signup" ? "Create an account" : <>Welcome<br />back.</>}
            </h1>
          </div>

          <div className="w-full max-w-sm">
            <AuthForm defaultMode={defaultMode} error={error} success={success} />
          </div>
        </div>
      </div>
    </div>
  );
}
