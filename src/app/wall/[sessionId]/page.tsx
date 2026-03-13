import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { DM_Serif_Display } from "next/font/google";
import { MessageSquare } from "lucide-react";

const serif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sessions")
    .select("title")
    .eq("id", sessionId)
    .single();
  return { title: data ? `${data.title} — Testimonial Wall` : "Testimonial Wall" };
}

const SENTIMENT_BADGE: Record<string, string> = {
  positive: "bg-green-100 text-green-700",
  neutral: "bg-stone-100 text-stone-600",
  negative: "bg-red-100 text-red-600",
};

const EMOJI_MAP: Record<string, string> = {
  loved_it: "❤️ Loved it",
  helpful: "👍 Helpful",
  needs_improvement: "🔧 Needs improvement",
  confused: "😕 Confused",
};

export default async function WallPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, session_date, wall_enabled, status")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  if (!session.wall_enabled) {
    return (
      <main className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white border border-stone-200 p-8">
          <MessageSquare size={48} className="mx-auto text-stone-300 mb-4" />
          <h1 className={`${serif.className} text-2xl text-stone-900 mb-2 italic`}>Wall not available</h1>
          <p className="text-stone-500 text-sm">
            The testimonial wall for this session has not been enabled.
          </p>
        </div>
      </main>
    );
  }

  type ResponseRow = {
    id: string;
    attendee_id: string;
    video_url: string | null;
    edited_video_url: string | null;
    wall_video_source: "raw" | "edited";
    transcript: string | null;
    sentiment: string | null;
    attendees: { name: string } | null;
  };

  const { data: rawResponses } = await supabase
    .from("responses")
    .select("*, attendees(name)")
    .eq("session_id", sessionId)
    .eq("approved_for_wall", true)
    .order("created_at", { ascending: false });

  const attendeeIds = (rawResponses ?? []).map((r) => (r as unknown as ResponseRow).attendee_id);

  const { data: rawReactions } = attendeeIds.length
    ? await supabase
        .from("reactions")
        .select("attendee_id, emoji_type")
        .eq("session_id", sessionId)
        .in("attendee_id", attendeeIds)
    : { data: [] };

  const reactionMap = new Map(
    (rawReactions ?? []).map((r) => [r.attendee_id, r.emoji_type as string])
  );

  const responses = (rawResponses ?? []) as unknown as ResponseRow[];

  return (
    <main className={`min-h-screen bg-stone-100 ${serif.variable}`}>
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
          <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">
            Testimonial Wall
          </p>
          <h1 className={`${serif.className} text-3xl sm:text-5xl text-stone-900 tracking-tight leading-tight mb-3`}>
            {session.title}
          </h1>
          {session.session_date && (
            <p className="text-sm text-stone-500">
              {new Date(session.session_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          {responses.length > 0 && (
            <p className="mt-3 text-sm text-stone-600 font-mono">
              {responses.length} testimonial{responses.length !== 1 ? "s" : ""} • All from real attendees
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        {responses.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare size={56} className="mx-auto text-stone-200 mb-4" />
            <p className="text-stone-400 text-sm">No approved testimonials yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {responses.map((r) => {
              const displayVideoUrl =
                (r.wall_video_source ?? "raw") === "edited" && r.edited_video_url
                  ? r.edited_video_url
                  : r.video_url;
              const fallbackVideoUrl =
                (r.wall_video_source ?? "raw") === "edited" ? r.video_url : null;
              const emoji = reactionMap.get(r.attendee_id) ?? null;
              const snippet = r.transcript
                ? r.transcript.length > 150
                  ? r.transcript.slice(0, 150).trimEnd() + "…"
                  : r.transcript
                : null;

              return (
                <div
                  key={r.id}
                  className="bg-white border border-stone-200 overflow-hidden flex flex-col group hover:border-orange-400 hover:shadow-md transition-all duration-300"
                >
                  {/* Video section with play overlay */}
                  {displayVideoUrl && (
                    <div className="relative bg-stone-900 aspect-video overflow-hidden group">
                      <video
                        autoPlay
                        muted
                        loop
                        controls
                        controlsList="nodownload"
                        playsInline
                        className="w-full h-full object-cover"
                      >
                        <source src={displayVideoUrl} />
                        {fallbackVideoUrl && <source src={fallbackVideoUrl} />}
                      </video>
                      {/* Play icon overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-orange-700 flex items-center justify-center shadow-lg">
                          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content section */}
                  <div className="p-5 flex flex-col gap-4 flex-1">
                    {/* Name + Emoji */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-orange-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {(r.attendees?.name ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-stone-900 truncate">
                          {r.attendees?.name ?? "Anonymous"}
                        </span>
                      </div>
                      {emoji && (
                        <span
                          className="text-xl shrink-0"
                          title={EMOJI_MAP[emoji] ?? emoji}
                          aria-label={EMOJI_MAP[emoji] ?? emoji}
                        >
                          {emoji}
                        </span>
                      )}
                    </div>

                    {/* Transcript snippet */}
                    {snippet ? (
                      <p className="text-sm text-stone-700 leading-relaxed flex-1 italic">
                        &ldquo;{snippet}&rdquo;
                      </p>
                    ) : (
                      !r.video_url && (
                        <p className="text-sm text-stone-400">No transcript available</p>
                      )
                    )}

                    {/* Sentiment badge */}
                    {r.sentiment && (
                      <div>
                        <span
                          className={`inline-block px-3 py-1 text-xs font-medium capitalize border ${
                            SENTIMENT_BADGE[r.sentiment] ?? SENTIMENT_BADGE.neutral
                          }`}
                        >
                          {r.sentiment}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-stone-200 bg-white mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 text-center">
          <p className="text-xs text-stone-500 font-mono uppercase tracking-wider">
            Powered by{" "}
            <Link href="/" className="text-orange-700 hover:text-orange-800 transition-colors font-bold">
              FeedbackLoop
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
