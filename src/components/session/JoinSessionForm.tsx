"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinSessionForm({ sessionId, sessionTitle }: { sessionId: string; sessionTitle: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          name,
          email,
        }),
      });

      const data = (await res.json()) as { error?: string; redirect_to?: string };
      if (!res.ok || !data.redirect_to) {
        setError(data.error ?? "Could not join this session right now.");
        return;
      }

      router.push(data.redirect_to);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-stone-200 p-6 sm:p-8 space-y-5">
        <div>
          <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.22em] mb-2">Session join</p>
          <h1 className="text-2xl font-bold text-stone-900">{sessionTitle}</h1>
          <p className="text-sm text-stone-500 mt-2">
            Enter your name and email to open your personal feedback link.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-mono uppercase tracking-[0.12em] text-stone-500 mb-1">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-stone-300 px-3 py-2 text-sm leading-5 text-stone-900 placeholder:text-stone-400 bg-white antialiased"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-[0.12em] text-stone-500 mb-1">Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-stone-300 px-3 py-2 text-sm leading-5 text-stone-900 placeholder:text-stone-400 bg-white antialiased"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-700 text-white text-sm font-semibold px-4 py-2.5 hover:bg-orange-800 disabled:opacity-60"
          >
            {submitting ? "Opening your link..." : "Start feedback"}
          </button>
        </form>
      </div>
    </main>
  );
}
