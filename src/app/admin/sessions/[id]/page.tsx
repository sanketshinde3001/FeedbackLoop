import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SessionControls } from "@/components/admin/SessionControls";
import { CopyButton } from "@/components/admin/CopyButton";
import { AddAttendeeForm, CSVUploadForm } from "@/components/admin/AttendeeForm";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Users,
} from "lucide-react";

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

  // Fetch session + attendees in parallel
  const [sessionRes, attendeesRes] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("attendees")
      .select("id, name, email, unique_token, submitted_at, reminded_at, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            Attendees ({attendees.length})
          </h2>
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
    </div>
  );
}
