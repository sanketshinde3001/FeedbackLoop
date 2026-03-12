"use client";

import { useState, useEffect } from "react";
import { DM_Serif_Display } from "next/font/google";

const serif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

interface Props {
  defaultMode: "login" | "signup";
  error?: string;
  success?: string;
}

export function AuthForm({ defaultMode, error, success }: Props) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);

  // Clear error/success from URL after displaying them
  useEffect(() => {
    if (error || success) {
      const url = new URL(window.location);
      url.searchParams.delete("error");
      url.searchParams.delete("success");
      url.searchParams.delete("mode");
      window.history.replaceState({}, "", url);
    }
  }, [error, success]);

  return (
    <div className="space-y-8">
      {/* Mode switcher — plain text underline style */}
      <div className="flex gap-8">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`text-sm font-medium pb-1 transition-colors ${
              mode === m
                ? "text-stone-900 border-b-2 border-orange-700"
                : "text-stone-400 hover:text-stone-600 border-b-2 border-transparent"
            }`}
          >
            {m === "login" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      {/* Desktop heading — only inside the form area */}
      <div className="hidden sm:block">
        <h2 className={`${serif.className} text-3xl tracking-tight leading-tight`}>
          {mode === "login" ? (
            <>
              Sign in to your<br />
              <span className="italic">account.</span>
            </>
          ) : (
            <>
              Create your<br />
              <span className="italic">account.</span>
            </>
          )}
        </h2>
      </div>

      {/* Success banner */}
      {success && (
        <div className="border-l-4 border-green-500 bg-green-50 px-4 py-3 text-sm text-green-800">
          {decodeURIComponent(success)}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">
          {decodeURIComponent(error)}
        </div>
      )}

      {mode === "login" ? <LoginForm /> : <SignupForm />}
    </div>
  );
}

function LoginForm() {
  return (
    <form action="/api/auth/login" method="POST" className="space-y-5">
      <Field id="email" label="Email address" type="email" name="email" autoComplete="email" placeholder="you@example.com" />
      <Field id="password" label="Password" type="password" name="password" autoComplete="current-password" placeholder="••••••••" />
      <button
        type="submit"
        className="w-full bg-orange-700 text-white text-sm font-semibold px-4 py-3.5 hover:bg-orange-800 transition-colors"
      >
        Sign in →
      </button>
    </form>
  );
}

function SignupForm() {
  return (
    <form action="/api/auth/signup" method="POST" className="space-y-5">
      <Field id="su-email" label="Email address" type="email" name="email" autoComplete="email" placeholder="you@example.com" />
      <Field id="su-password" label="Password" type="password" name="password" autoComplete="new-password" placeholder="••••••••" hint="Minimum 8 characters" />
      <Field id="su-confirm" label="Confirm password" type="password" name="confirm_password" autoComplete="new-password" placeholder="••••••••" />
      <button
        type="submit"
        className="w-full bg-orange-700 text-white text-sm font-semibold px-4 py-3.5 hover:bg-orange-800 transition-colors"
      >
        Create account →
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  name,
  autoComplete,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-mono text-[10px] text-stone-500 uppercase tracking-[0.18em] mb-2">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        className="w-full border border-stone-300 bg-stone-50 px-3.5 py-3 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-stone-700 focus:bg-white transition-colors"
      />
      {hint && <p className="mt-1.5 font-mono text-[10px] text-stone-400 tracking-wide">{hint}</p>}
    </div>
  );
}
