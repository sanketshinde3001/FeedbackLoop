"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

export default function AISummaryPanel({ sessionId }: { sessionId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate summary");
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-stone-500">
          Gemini reads all transcripts and writes a short executive summary.
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-orange-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all touch-manipulation"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          {loading ? "Generating…" : summary ? "Re-generate" : "Generate summary"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 border-l-2 border-red-500 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {summary && (
        <div className="bg-stone-50 border border-stone-200 px-4 py-3">
          <p className="text-sm text-stone-800 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}
