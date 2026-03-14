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
  edited_video_url: string | null;
  caption_vtt_url: string | null;
  wall_video_source: "raw" | "edited";
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
  const [editing, setEditing]         = useState<Set<string>>(new Set());
  const [approving, setApproving]     = useState<Set<string>>(new Set());
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [videoOpen, setVideoOpen]     = useState<Set<string>>(new Set());
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [previewSource, setPreviewSource] = useState<Record<string, "raw" | "edited">>(() =>
    Object.fromEntries(initial.map((r) => [r.id, r.edited_video_url ? "edited" : "raw"]))
  );

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
    const selectedSource = previewSource[id] ?? "raw";
    setApproving((s) => new Set(s).add(id));
    setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    try {
      const res = await fetch("/api/session/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: id,
          approved: !current,
          ...(selectedSource === "edited" ? { wall_video_source: "edited" } : {}),
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (res.ok) {
        setResponses((prev) => prev.map((r) =>
          r.id === id
            ? { ...r, approved_for_wall: !current, wall_video_source: selectedSource }
            : r
        ));
      } else {
        setErrors((e) => ({ ...e, [id]: (data.error as string) ?? "Could not update wall selection." }));
      }
    } catch {
      setErrors((e) => ({ ...e, [id]: "Network error. Try again." }));
    } finally {
      setApproving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function handleEditVideo(id: string) {
    setEditing((s) => new Set(s).add(id));
    setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    try {
      const res = await fetch("/api/session/edit-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: id }),
      });

      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setErrors((e) => ({ ...e, [id]: (data.error as string) ?? "Video edit failed. Try again." }));
        return;
      }

      setResponses((prev) => prev.map((r) =>
        r.id === id
          ? {
              ...r,
              edited_video_url: (data.edited_video_url as string) ?? r.edited_video_url,
              caption_vtt_url: (data.caption_vtt_url as string) ?? r.caption_vtt_url,
              transcript: (data.transcript as string) ?? r.transcript,
            }
          : r
      ));
      setPreviewSource((p) => ({ ...p, [id]: "edited" }));
    } catch {
      setErrors((e) => ({ ...e, [id]: "Network error while editing video." }));
    } finally {
      setEditing((s) => { const n = new Set(s); n.delete(id); return n; });
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
        const editPending = editing.has(r.id);
        const selectedSource = previewSource[r.id] ?? (r.edited_video_url ? "edited" : "raw");
        const videoSrc = selectedSource === "edited" && r.edited_video_url ? r.edited_video_url : r.video_url;
        const canUseEdited = !!r.edited_video_url;
        const fallbackVideoSrc = selectedSource === "edited" ? r.video_url : null;

        return (
          <div key={r.id} className="border border-stone-200 overflow-hidden hover:border-stone-300 transition-colors">

            {/* Inline video player */}
            {videoSrc && videoShown && (
              <div className="bg-gray-950 aspect-video w-full">
                <video
                  key={videoSrc}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                >
                  <source src={videoSrc} />
                  {fallbackVideoSrc && <source src={fallbackVideoSrc} />}
                  {selectedSource === "edited" && r.caption_vtt_url && (
                    <track kind="captions" src={r.caption_vtt_url} srcLang="en" label="English" default />
                  )}
                </video>
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{r.attendee_name}</p>
                  <p className="text-xs text-stone-400 mt-0.5 truncate">{r.attendee_email}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Submitted {new Date(r.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {canUseEdited && (
                    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 whitespace-nowrap">
                      Edited ready
                    </span>
                  )}
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
                          {`${Math.abs(r.sentiment_score * 10).toFixed(1).replace(/\.0$/, "")}/10`}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Not analyzed</span>
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
              <div className="space-y-3 pt-1 border-t border-stone-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.video_url && (
                    <button
                      onClick={() => setVideoOpen((s) => toggle(s, r.id))}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 px-3 py-1.5 transition-colors touch-manipulation"
                    >
                      {videoShown ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                      {videoShown ? "Hide video" : "Watch video"}
                    </button>
                  )}

                  {r.video_url && (
                    <button
                      onClick={() => handleEditVideo(r.id)}
                      disabled={editPending}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      <RefreshCw size={11} className={editPending ? "animate-spin" : ""} />
                      {editPending ? "Editing…" : canUseEdited ? "Re-edit" : "Edit it"}
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
                    {r.approved_for_wall ? `On wall (${r.wall_video_source})` : "Add to wall"}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap border-t border-stone-100 pt-2">
                  <div className="inline-flex items-center gap-2 border border-stone-200 bg-stone-50 px-3 py-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-[0.12em] text-stone-400">
                      Wall source
                    </label>
                    <select
                      value={selectedSource}
                      onChange={(e) =>
                        setPreviewSource((p) => ({ ...p, [r.id]: e.target.value as "raw" | "edited" }))
                      }
                      className="text-xs text-stone-700 bg-transparent outline-none"
                    >
                      <option value="raw">Raw video</option>
                      <option value="edited" disabled={!canUseEdited}>Edited video</option>
                    </select>
                  </div>

                  {canAnalyze && (
                    <button
                      onClick={() => handleReanalyze(r.id)}
                      disabled={analyzing}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      <RefreshCw size={11} className={analyzing ? "animate-spin" : ""} />
                      {analyzing ? "Analyzing…" : r.sentiment ? "Re-analyze" : "Analyze"}
                    </button>
                  )}

                  {r.video_url && (
                    <a
                      href={r.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 bg-white border border-stone-200 hover:border-stone-300 px-3 py-1.5 transition-colors"
                    >
                      Raw file
                    </a>
                  )}
                  {r.edited_video_url && (
                    <a
                      href={r.edited_video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 hover:text-orange-800 bg-orange-50 border border-orange-200 hover:border-orange-300 px-3 py-1.5 transition-colors"
                    >
                      Edited file
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
