"use client";

import { useState } from "react";

interface Props {
  defaultMode: "login" | "signup";
  error?: string;
  success?: string;
}

export function AuthForm({ defaultMode, error, success }: Props) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      {/* Tab switcher */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sign up
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {decodeURIComponent(success)}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {mode === "login" ? (
        <LoginForm />
      ) : (
        <SignupForm />
      )}
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
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        Sign in
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
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        Create account
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
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
