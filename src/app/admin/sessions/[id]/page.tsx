import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SessionControls } from "@/components/admin/SessionControls";
import { CopyButton } from "@/components/admin/CopyButton";
import { AddAttendeeForm, CSVUploadForm } from "@/components/admin/AttendeeForm";
import { sendReminders } from "@/app/admin/sessions/actions";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import ResponsesPanel, { type ResponseWithAttendee } from "@/components/admin/ResponsesPanel";
import AISummaryPanel from "@/components/admin/AISummaryPanel";

export const metadata: Metadata = { title: "Session Detail" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; success?: string }>;
}

const STATUS_PILL: Record<string, string> = {
  draft:  "bg-stone-100 text-stone-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-red-100  text-red-600",
};

export default async function SessionDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, success } = await searchParams;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [sessionRes, attendeesRes, responsesRes, reactionsRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).single(),
    supabase
      .from("attendees")
      .select("id, name, email, unique_token, submitted_at, reminded_at, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("responses")
      .select("*, attendees(name, email)")
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reactions")
      .select("attendee_id, emoji_type")
      .eq("session_id", id),
  ]);

  if (sessionRes.error || !sessionRes.data) notFound();

  const session = sessionRes.data;

  // Verify ownership — only the session host can view it
  if (session.host_id !== user.id) notFound();
  const attendees = attendeesRes.data ?? [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const submittedCount = attendees.filter((a) => a.submitted_at).length;
  const responseRate =
    attendees.length > 0
      ? Math.round((submittedCount / attendees.length) * 100)
      : 0;

  type RawResponse = {
    id: string;
    attendee_id: string;
    video_url: string | null;
    edited_video_url: string | null;
    caption_vtt_url: string | null;
    wall_video_source: "raw" | "edited";
    transcript: string | null;
    sentiment: string | null;
    sentiment_score: number | null;
    ai_conclusion: string | null;
    approved_for_wall: boolean;
    created_at: string;
    attendees: { name: string; email: string } | null;
  };

  const rawResponses = (responsesRes.data ?? []) as unknown as RawResponse[];
  const reactionMap = new Map(
    (reactionsRes.data ?? []).map((r) => [r.attendee_id, r.emoji_type as string])
  );
  const responsesList: ResponseWithAttendee[] = rawResponses.map((r) => ({
    id: r.id,
    attendee_id: r.attendee_id,
    video_url: r.video_url,
    edited_video_url: r.edited_video_url ?? null,
    caption_vtt_url: r.caption_vtt_url ?? null,
    wall_video_source: r.wall_video_source ?? "raw",
    transcript: r.transcript,
    sentiment: r.sentiment as ResponseWithAttendee["sentiment"],
    sentiment_score: r.sentiment_score,
    ai_conclusion: r.ai_conclusion,
    approved_for_wall: r.approved_for_wall,
    created_at: r.created_at,
    attendee_name: r.attendees?.name ?? "Unknown",
    attendee_email: r.attendees?.email ?? "",
    emoji_type: reactionMap.get(r.attendee_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft size={15} />
        All Sessions
      </Link>

      {/* Header */}
      <div className="bg-white border border-stone-200 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">{session.title}</h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-medium capitalize ${
                  STATUS_PILL[session.status] ?? STATUS_PILL.draft
                }`}
              >
                {session.status}
              </span>
              {session.wall_enabled && (
                <span className="px-2.5 py-0.5 text-xs font-medium bg-stone-100 text-stone-600">
                  Wall on
                </span>
              )}
            </div>
            {session.session_date && (
              <p className="text-sm text-stone-400 mt-1">
                {new Date(session.session_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-stone-200 border border-stone-200 w-full lg:w-auto">
            <div className="bg-white px-3 sm:px-5 py-2 sm:py-3 text-center min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-stone-900">{attendees.length}</p>
              <p className="font-mono text-[9px] sm:text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-0.5">Attendees</p>
            </div>
            <div className="bg-white px-3 sm:px-5 py-2 sm:py-3 text-center min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-stone-900">{submittedCount}</p>
              <p className="font-mono text-[9px] sm:text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-0.5">Submitted</p>
            </div>
            <div className="bg-white px-3 sm:px-5 py-2 sm:py-3 text-center min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-orange-700">{responseRate}%</p>
              <p className="font-mono text-[9px] sm:text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-0.5">Rate</p>
            </div>
          </div>
        </div>

        {/* Session controls */}
        <SessionControls
          sessionId={session.id}
          currentStatus={session.status}
          wallEnabled={session.wall_enabled}
          appUrl={appUrl}
        />
      </div>

      {/* Alerts */}
      {error && (
        <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {success && (
        <div className="border-l-2 border-green-500 bg-green-50 px-4 py-3 text-sm text-green-700">
          {decodeURIComponent(success)}
        </div>
      )}

      {/* Questions */}
      <div className="bg-white border border-stone-200 p-4 sm:p-6">
        <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-3">Questions</h2>
        {session.questions.length > 0 ? (
          <ol className="space-y-2 list-decimal list-inside">
            {session.questions.map((q: string, i: number) => (
              <li key={i} className="text-sm text-stone-700">
                {q}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-stone-400">No questions added</p>
        )}
      </div>

      {/* Attendees */}
      <div className="bg-white border border-stone-200 p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] flex items-center gap-2">
            <Users size={12} />
            Attendees ({attendees.length})
          </h2>
          {attendees.some((a) => !a.submitted_at) && (
            <form action={sendReminders.bind(null, session.id)}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98] transition-all touch-manipulation w-full sm:w-auto justify-center"
              >
                <Bell size={13} />
                Send Reminders
              </button>
            </form>
          )}
        </div>

        {/* Add attendee */}
        <div className="space-y-3 border-b border-stone-100 pb-5">
          <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">
            Add manually
          </p>
          <AddAttendeeForm sessionId={session.id} />
          <CSVUploadForm sessionId={session.id} />
        </div>

        {/* Attendee list */}
        {attendees.length > 0 ? (
          <div className="space-y-3">
            {/* Desktop Table header */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto] gap-4 pb-2 font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">
              <span>Name</span>
              <span>Email</span>
              <span>Status</span>
              <span>Link</span>
            </div>

            {attendees.map((a) => {
              const link = `${appUrl}/session/${a.unique_token}`;
              return (
                <div
                  key={a.id}
                  className="border border-stone-100 p-3 md:border-0 md:p-0 md:grid md:grid-cols-[1fr_1fr_auto_auto] md:gap-4 md:items-center space-y-2 md:space-y-0"
                >
                  {/* Mobile card layout */}
                  <div className="md:contents">
                    <div className="flex items-start justify-between gap-2 md:block">
                      <div>
                        <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-0.5 md:hidden">Name</p>
                        <span className="text-sm font-medium text-stone-800 wrap-break-word">
                          {a.name}
                        </span>
                      </div>
                      <div className="md:hidden">
                        {a.submitted_at ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 size={13} /> Done
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-stone-400">
                            <Clock size={13} /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="md:block">
                      <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-0.5 md:hidden">Email</p>
                      <span className="text-sm text-stone-500 break-all flex items-center gap-1">
                        <Mail size={13} className="shrink-0 text-stone-300" />
                        {a.email}
                      </span>
                    </div>
                    <span className="hidden md:block">
                      {a.submitted_at ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 size={13} /> Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Clock size={13} /> Pending
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider md:hidden">Link</p>
                      <span className="flex items-center gap-1">
                        <span className="text-xs text-stone-300 truncate max-w-32 md:max-w-24 md:hidden md:lg:block">
                          …{a.unique_token.slice(-8)}
                        </span>
                        <CopyButton text={link} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users size={36} className="mx-auto text-stone-200 mb-2" />
            <p className="text-sm text-stone-400">No attendees yet — add them above</p>
          </div>
        )}
      </div>
      {/* AI Summary */}
      {responsesList.some((r) => r.transcript) && (
        <div className="bg-white border border-stone-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] flex items-center gap-2">
            <Sparkles size={12} className="text-orange-500" />
            AI Session Summary
          </h2>
          <AISummaryPanel sessionId={session.id} />
        </div>
      )}

      {/* Responses */}
      <div className="bg-white border border-stone-200 p-4 sm:p-6 space-y-4">
        <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] flex items-center gap-2">
          <MessageSquare size={12} />
          Responses ({responsesList.length})
        </h2>
        <ResponsesPanel responses={responsesList} />
      </div>
    </div>
  );
}
