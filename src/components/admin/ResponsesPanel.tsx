"use client";

import { useState } from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ThumbsUp,
  Minus,
  ThumbsDown,
  CheckSquare,
  Square,
  Play,
  Pause,
} from "lucide-react";

export type ResponseWithAttendee = {
  id: string;
  attendee_id: string;
  video_url: string | null;
  transcript: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  sentiment_score: number | null;
  ai_conclusion: string | null;
  approved_for_wall: boolean;
  created_at: string;
  attendee_name: string;
  attendee_email: string;
  emoji_type: string | null;
};

const SENTIMENT_CONFIG = {
  positive: { classes: "bg-green-50 text-green-700 border-green-200", Icon: ThumbsUp },
  neutral:  { classes: "bg-stone-50 text-stone-600 border-stone-200", Icon: Minus    },
  negative: { classes: "bg-red-50 text-red-700 border-red-200",       Icon: ThumbsDown },
} as const;

const EMOJI_MAP: Record<string, string> = {
  loved_it:          "❤️ Loved it",
  helpful:           "👍 Helpful",
  needs_improvement: "🔧 Needs improvement",
  confused:          "😕 Confused",
};

export default function ResponsesPanel({ responses: initial }: { responses: ResponseWithAttendee[] }) {
  const [responses, setResponses] = useState(initial);
  const [reanalyzing, setReanalyzing] = useState<Set<string>>(new Set());
  const [approving, setApproving]     = useState<Set<string>>(new Set());
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [videoOpen, setVideoOpen]     = useState<Set<string>>(new Set());
  const [errors, setErrors]           = useState<Record<string, string>>({});

  async function handleReanalyze(id: string) {
    setReanalyzing((s) => new Set(s).add(id));
    setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    try {
      const res = await fetch("/api/session/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: id }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setErrors((e) => ({ ...e, [id]: (data.error as string) ?? "Analysis failed. Try again." }));
        return;
      }
      setResponses((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
    } catch {
      setErrors((e) => ({ ...e, [id]: "Network error. Try again." }));
    } finally {
      setReanalyzing((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function handleApprove(id: string, current: boolean) {
    setApproving((s) => new Set(s).add(id));
    try {
      const res = await fetch("/api/session/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: id, approved: !current }),
      });
      if (res.ok) {
        setResponses((prev) => prev.map((r) => r.id === id ? { ...r, approved_for_wall: !current } : r));
      }
    } finally {
      setApproving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  function toggle(set: Set<string>, id: string): Set<string> {
    const n = new Set(set);
    if (n.has(id)) {
      n.delete(id);
    } else {
      n.add(id);
    }
    return n;
  }

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
        <MessageSquare size={36} className="text-stone-200" />
        <p className="text-sm text-stone-400">No responses submitted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {responses.map((r) => {
        const analyzing  = reanalyzing.has(r.id);
        const approvePending = approving.has(r.id);
        const transcriptOpen = expanded.has(r.id);
        const videoShown = videoOpen.has(r.id);
        const sentCfg    = r.sentiment ? SENTIMENT_CONFIG[r.sentiment] : null;
        const canAnalyze = !!(r.video_url || r.transcript);

        return (
          <div key={r.id} className="border border-stone-200 overflow-hidden hover:border-stone-300 transition-colors">

            {/* Inline video player */}
            {r.video_url && videoShown && (
              <div className="bg-gray-950 aspect-video w-full">
                <video
                  key={r.video_url}
                  src={r.video_url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{r.attendee_name}</p>
                  <p className="text-xs text-stone-400 mt-0.5 truncate">{r.attendee_email}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {r.emoji_type && (
                    <span className="text-xs text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 whitespace-nowrap">
                      {EMOJI_MAP[r.emoji_type] ?? r.emoji_type}
                    </span>
                  )}
                  {sentCfg ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 border whitespace-nowrap ${sentCfg.classes}`}>
                      <sentCfg.Icon size={11} />
                      <span className="capitalize">{r.sentiment}</span>
                      {r.sentiment_score !== null && (
                        <span className="opacity-70">
                          {r.sentiment_score > 0 ? "+" : ""}{r.sentiment_score.toFixed(2)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 italic">not analyzed</span>
                  )}
                </div>
              </div>

              {/* AI Conclusion */}
              {r.ai_conclusion && (
                <p className="text-sm text-stone-800 bg-stone-50 border border-stone-200 px-3 py-2.5 leading-relaxed">
                  {r.ai_conclusion}
                </p>
              )}

              {/* Error */}
              {errors[r.id] && (
                <div className="bg-red-50/80 border border-red-200 rounded px-3 py-3 backdrop-blur-sm">
                  <p className="text-xs font-medium text-red-700 mb-1">⚠ Cannot analyze</p>
                  <p className="text-xs text-red-600 leading-relaxed">{errors[r.id]}</p>
                </div>
              )}

              {/* Transcript */}
              {r.transcript && (
                <div>
                  <button
                    onClick={() => setExpanded((s) => toggle(s, r.id))}
                    className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors touch-manipulation"
                  >
                    {transcriptOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {transcriptOpen ? "Hide transcript" : "Show transcript"}
                  </button>
                  {transcriptOpen && (
                    <div className="mt-2 text-sm text-stone-600 leading-relaxed bg-stone-50 border border-stone-200 p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {r.transcript}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {r.video_url && (
                  <button
                    onClick={() => setVideoOpen((s) => toggle(s, r.id))}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 px-3 py-1.5 transition-colors touch-manipulation"
                  >
                    {videoShown ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                    {videoShown ? "Hide video" : "Watch video"}
                  </button>
                )}

                {canAnalyze && (
                  <button
                    onClick={() => handleReanalyze(r.id)}
                    disabled={analyzing}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    <RefreshCw size={11} className={analyzing ? "animate-spin" : ""} />
                    {analyzing ? "Analyzing…" : r.sentiment ? "Re-analyze" : "Analyze now"}
                  </button>
                )}

                <button
                  onClick={() => handleApprove(r.id, r.approved_for_wall)}
                  disabled={approvePending}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border transition-colors disabled:opacity-50 touch-manipulation ${
                    r.approved_for_wall
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {r.approved_for_wall ? <CheckSquare size={11} /> : <Square size={11} />}
                  {r.approved_for_wall ? "On wall" : "Add to wall"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
