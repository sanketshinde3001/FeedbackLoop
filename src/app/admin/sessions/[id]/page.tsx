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
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-600",
};

export default async function SessionDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const [sessionRes, attendeesRes, responsesRes, reactionsRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).single(),
    supabase
      .from("attendees")
      .select("id, name, email, unique_token, submitted_at, reminded_at, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("responses")
      .select("id, attendee_id, video_url, transcript, sentiment, sentiment_score, ai_conclusion, approved_for_wall, created_at, attendees(name, email)")
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reactions")
      .select("attendee_id, emoji_type")
      .eq("session_id", id),
  ]);

  if (sessionRes.error || !sessionRes.data) notFound();

  const session = sessionRes.data;
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
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={15} />
        All Sessions
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{session.title}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  STATUS_PILL[session.status] ?? STATUS_PILL.draft
                }`}
              >
                {session.status}
              </span>
              {session.wall_enabled && (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700">
                  Wall on
                </span>
              )}
            </div>
            {session.session_date && (
              <p className="text-sm text-gray-400 mt-1">
                {new Date(session.session_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-5 text-center shrink-0">
            <div>
              <p className="text-2xl font-bold text-gray-900">{attendees.length}</p>
              <p className="text-xs text-gray-400">Attendees</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{submittedCount}</p>
              <p className="text-xs text-gray-400">Submitted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{responseRate}%</p>
              <p className="text-xs text-gray-400">Response rate</p>
            </div>
          </div>
        </div>

        {/* Session controls */}
        <SessionControls
          sessionId={session.id}
          currentStatus={session.status}
          wallEnabled={session.wall_enabled}
        />
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {decodeURIComponent(success)}
        </div>
      )}

      {/* Questions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Questions</h2>
        {session.questions.length > 0 ? (
          <ol className="space-y-2 list-decimal list-inside">
            {session.questions.map((q: string, i: number) => (
              <li key={i} className="text-sm text-gray-700">
                {q}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-400">No questions added</p>
        )}
      </div>

      {/* Attendees */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            Attendees ({attendees.length})
          </h2>
          {attendees.some((a) => !a.submitted_at) && (
            <form action={sendReminders.bind(null, session.id)}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all touch-manipulation"
              >
                <Bell size={13} />
                Send Reminders
              </button>
            </form>
          )}
        </div>

        {/* Add attendee */}
        <div className="space-y-3 border-b border-gray-100 pb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Add manually
          </p>
          <AddAttendeeForm sessionId={session.id} />
          <CSVUploadForm sessionId={session.id} />
        </div>

        {/* Attendee list */}
        {attendees.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
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
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center py-3"
                >
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {a.name}
                  </span>
                  <span className="text-sm text-gray-500 truncate flex items-center gap-1">
                    <Mail size={13} className="shrink-0 text-gray-300" />
                    {a.email}
                  </span>
                  <span>
                    {a.submitted_at ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 size={13} /> Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={13} /> Pending
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-gray-300 truncate max-w-24 hidden lg:block">
                      …{a.unique_token.slice(-8)}
                    </span>
                    <CopyButton text={link} />
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users size={36} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No attendees yet — add them above</p>
          </div>
        )}
      </div>
      {/* AI Summary */}
      {responsesList.some((r) => r.transcript) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            AI Session Summary
          </h2>
          <AISummaryPanel sessionId={session.id} />
        </div>
      )}

      {/* Responses */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MessageSquare size={16} className="text-gray-400" />
          Responses ({responsesList.length})
        </h2>
        <ResponsesPanel responses={responsesList} />
      </div>
    </div>
  );
}
