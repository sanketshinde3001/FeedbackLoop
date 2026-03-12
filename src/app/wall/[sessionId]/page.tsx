import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { MessageSquare } from "lucide-react";

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
  neutral: "bg-gray-100 text-gray-600",
  negative: "bg-red-100 text-red-600",
};

const EMOJI_LABEL: Record<string, string> = {
  "👍": "Loved it",
  "😐": "It was okay",
  "😕": "Not great",
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
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Wall not available</h1>
          <p className="text-gray-500 text-sm">
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
    transcript: string | null;
    sentiment: string | null;
    attendees: { name: string } | null;
  };

  const { data: rawResponses } = await supabase
    .from("responses")
    .select("id, attendee_id, video_url, transcript, sentiment, attendees(name)")
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
    <main className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-2">
            Testimonials
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {session.title}
          </h1>
          {session.session_date && (
            <p className="text-sm text-gray-400 mt-2">
              {new Date(session.session_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          {responses.length > 0 && (
            <p className="mt-3 text-sm text-gray-500">
              {responses.length} attendee{responses.length !== 1 ? "s" : ""} shared their feedback
            </p>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {responses.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare size={52} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 text-sm">No approved testimonials yet.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {responses.map((r) => {
              const emoji = reactionMap.get(r.attendee_id) ?? null;
              const snippet = r.transcript
                ? r.transcript.length > 200
                  ? r.transcript.slice(0, 200).trimEnd() + "…"
                  : r.transcript
                : null;

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Video player — shown first if available */}
                  {r.video_url && (
                    <div className="bg-gray-950 aspect-video">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video
                        src={r.video_url}
                        controls
                        playsInline
                        preload="none"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Avatar initial */}
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                        {(r.attendees?.name ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {r.attendees?.name ?? "Anonymous"}
                      </span>
                    </div>
                    {emoji && (
                      <span
                        title={EMOJI_LABEL[emoji]}
                        className="text-xl"
                        aria-label={EMOJI_LABEL[emoji]}
                      >
                        {emoji}
                      </span>
                    )}
                  </div>

                  {/* Transcript snippet */}
                  {snippet ? (
                    <p className="text-sm text-gray-600 leading-relaxed flex-1">
                      &ldquo;{snippet}&rdquo;
                    </p>
                  ) : (
                    !r.video_url && (
                      <p className="text-sm text-gray-300 italic flex-1">No transcript available</p>
                    )
                  )}

                  {/* Sentiment badge */}
                  {r.sentiment && (
                    <div>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
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
      <div className="text-center pb-10">
        <p className="text-xs text-gray-300">
          Powered by{" "}
          <Link href="/" className="hover:text-gray-400 transition-colors">
            FeedbackLoop
          </Link>
        </p>
      </div>
    </main>
  );
}
