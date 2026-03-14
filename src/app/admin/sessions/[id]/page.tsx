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
  Info,
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
  const publicJoinLink = `${appUrl}/session/join/${session.id}`;

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
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft size={15} />
        All Sessions
      </Link>

      <section className="bg-white border border-stone-200 p-5 sm:p-7 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">{session.title}</h1>
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
              <p className="text-sm text-stone-500">
                {new Date(session.session_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <p className="max-w-2xl text-sm text-stone-500 leading-relaxed">
              Manage this session from one place: share the feedback link, add attendees, review responses, and decide what appears on the wall.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-px bg-stone-200 border border-stone-200 w-full xl:w-auto xl:min-w-90">
            <div className="bg-white px-4 sm:px-5 py-3 text-center min-w-0">
              <p className="text-2xl font-bold text-stone-900">{attendees.length}</p>
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-0.5">Attendees</p>
            </div>
            <div className="bg-white px-4 sm:px-5 py-3 text-center min-w-0">
              <p className="text-2xl font-bold text-stone-900">{submittedCount}</p>
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-0.5">Submitted</p>
            </div>
            <div className="bg-white px-4 sm:px-5 py-3 text-center min-w-0">
              <p className="text-2xl font-bold text-orange-700">{responseRate}%</p>
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-0.5">Response rate</p>
            </div>
          </div>
        </div>

        <details className="group border border-stone-200 bg-stone-50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-stone-700">
            <span className="inline-flex items-center gap-2">
              <Info size={14} className="text-stone-500" />
              Need help?
            </span>
            <span className="text-xs text-stone-500 group-open:hidden">Show steps</span>
            <span className="hidden text-xs text-stone-500 group-open:inline">Hide steps</span>
          </summary>

          <div className="grid gap-3 border-t border-stone-200 p-4 md:grid-cols-3">
            <div className="border border-stone-200 bg-white p-4">
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-2">Step 1</p>
              <p className="text-sm font-medium text-stone-800">Share the general feedback link</p>
              <p className="text-xs text-stone-500 mt-1">People enter name and email first, then get their own personal recording link.</p>
            </div>
            <div className="border border-stone-200 bg-white p-4">
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-2">Step 2</p>
              <p className="text-sm font-medium text-stone-800">Add attendees or import a CSV</p>
              <p className="text-xs text-stone-500 mt-1">Use this if you want more control and individual reminder flows.</p>
            </div>
            <div className="border border-stone-200 bg-white p-4">
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-2">Step 3</p>
              <p className="text-sm font-medium text-stone-800">Review responses and publish the best ones</p>
              <p className="text-xs text-stone-500 mt-1">Analyze, edit, approve for wall, and choose raw or edited video.</p>
            </div>
          </div>
        </details>
      </section>

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px] items-start">
        <div className="space-y-6">
          <section className="bg-white border border-stone-200 p-5 sm:p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Attendees</h2>
                <p className="text-sm text-stone-500 mt-1">
                  Add people, send reminders, and copy each person&apos;s direct feedback link.
                </p>
              </div>
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

            <div className="border border-stone-200 bg-stone-50 p-4 space-y-3">
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">Add one attendee</p>
              <AddAttendeeForm sessionId={session.id} />
            </div>

            <div className="border border-stone-200 bg-stone-50 p-4 space-y-3">
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">Import many attendees</p>
              <CSVUploadForm sessionId={session.id} />
            </div>

            {attendees.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">Current attendees</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200">{submittedCount} submitted</span>
                    <span className="px-2 py-1 bg-stone-50 text-stone-600 border border-stone-200">{attendees.length - submittedCount} pending</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px_72px] gap-4 pb-2 font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">
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
                        className="border border-stone-100 p-3 md:border-0 md:p-0 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px_72px] md:gap-4 md:items-center space-y-2 md:space-y-0"
                      >
                        <div className="flex items-start justify-between gap-2 md:block min-w-0">
                          <div>
                            <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-0.5 md:hidden">Name</p>
                            <span className="text-sm font-medium text-stone-800 wrap-break-word">{a.name}</span>
                          </div>
                          <div className="md:hidden">
                            {a.submitted_at ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium whitespace-nowrap">
                                <CheckCircle2 size={13} /> Done
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-stone-400 whitespace-nowrap">
                                <Clock size={13} /> Pending
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-0.5 md:hidden">Email</p>
                          <span className="text-sm text-stone-500 break-all flex items-center gap-1 min-w-0">
                            <Mail size={13} className="shrink-0 text-stone-300" />
                            {a.email}
                          </span>
                        </div>

                        <span className="hidden md:flex items-center gap-1 text-xs whitespace-nowrap">
                          {a.submitted_at ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium whitespace-nowrap">
                              <CheckCircle2 size={13} /> Done
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-stone-400 whitespace-nowrap">
                              <Clock size={13} /> Pending
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-2 md:justify-self-start whitespace-nowrap">
                          <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider md:hidden">Link</p>
                          <span className="text-xs text-stone-300 truncate max-w-32 md:max-w-16">...{a.unique_token.slice(-8)}</span>
                          <CopyButton text={link} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-stone-200 bg-stone-50">
                <Users size={36} className="mx-auto text-stone-200 mb-2" />
                <p className="text-sm text-stone-500">No attendees yet. Add one person manually or import a CSV to get started.</p>
              </div>
            )}
          </section>

          <section className="bg-white border border-stone-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Responses</h2>
                <p className="text-sm text-stone-500 mt-1">
                  Review submitted videos, run analysis, create edited versions, and choose what goes on the wall.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 bg-stone-50 border border-stone-200 px-2.5 py-1">
                <MessageSquare size={12} />
                {responsesList.length} total
              </span>
            </div>
            <ResponsesPanel responses={responsesList} />
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6">
          <section className="bg-white border border-stone-200 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Share link</h2>
              <p className="text-sm text-stone-500 mt-1">
                Send one link on WhatsApp, email, or chat. Each person fills in name and email before recording.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">General feedback link</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={publicJoinLink}
                  className="w-full border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-700"
                  aria-label="General feedback link"
                />
                <CopyButton text={publicJoinLink} />
              </div>
            </div>
          </section>

          <section className="bg-white border border-stone-200 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Session settings</h2>
              <p className="text-sm text-stone-500 mt-1">
                Change status, control the wall, open the live wall, or delete this session.
              </p>
            </div>
            <SessionControls
              sessionId={session.id}
              currentStatus={session.status}
              wallEnabled={session.wall_enabled}
              appUrl={appUrl}
            />
          </section>

          <section className="bg-white border border-stone-200 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Questions</h2>
              <p className="text-sm text-stone-500 mt-1">
                These are the prompts attendees will answer in their testimonial.
              </p>
            </div>
            {session.questions.length > 0 ? (
              <div className="space-y-3">
                {session.questions.map((q: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 border border-stone-200 bg-stone-50 p-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center border border-stone-200 bg-white text-xs font-semibold text-stone-600 shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-stone-700 leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">No questions added</p>
            )}
          </section>

          {responsesList.some((r) => r.transcript) && (
            <section className="bg-white border border-stone-200 p-5 space-y-4">
              <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] flex items-center gap-2">
                <Sparkles size={12} className="text-orange-500" />
                AI Session Summary
              </h2>
              <AISummaryPanel sessionId={session.id} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
