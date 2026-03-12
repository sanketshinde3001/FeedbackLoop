import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, Clock, Mail, Users, CalendarDays } from "lucide-react";
import Link from "next/link";
import { sendReminders } from "@/app/admin/sessions/actions";

export const metadata: Metadata = { title: "Attendees" };

export default async function AttendeesPage() {
  const supabase = await createClient();

  const { data: attendees } = await supabase
    .from("attendees")
    .select("id, name, email, submitted_at, reminded_at, created_at, session_id, sessions(title, status)")
    .order("created_at", { ascending: false });

  const rows = (attendees ?? []) as Array<{
    id: string;
    name: string;
    email: string;
    submitted_at: string | null;
    reminded_at: string | null;
    created_at: string;
    session_id: string;
    sessions: { title: string; status: string } | null;
  }>;

  const total = rows.length;
  const submitted = rows.filter((a) => a.submitted_at).length;
  const pending = total - submitted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendees</h1>
        <p className="text-sm text-gray-500 mt-1">All attendees across every session</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: total, color: "text-gray-900" },
          { label: "Submitted", value: submitted, color: "text-green-600" },
          { label: "Pending", value: pending, color: "text-amber-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Users size={36} className="text-gray-200" />
            <p className="text-sm text-gray-400">No attendees yet — add them from a session</p>
            <Link
              href="/admin/sessions"
              className="text-sm text-indigo-600 hover:underline"
            >
              Go to Sessions →
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <span>Name</span>
              <span>Email</span>
              <span>Session</span>
              <span>Status</span>
              <span>Remind</span>
            </div>

            <div className="divide-y divide-gray-50">
              {rows.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-1 sm:gap-4 px-5 py-4 sm:items-center"
                >
                  {/* Name */}
                  <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>

                  {/* Email */}
                  <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                    <Mail size={12} className="shrink-0 text-gray-300 hidden sm:block" />
                    {a.email}
                  </p>

                  {/* Session */}
                  <Link
                    href={`/admin/sessions/${a.session_id}`}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 truncate"
                  >
                    <CalendarDays size={11} className="shrink-0" />
                    {a.sessions?.title ?? "—"}
                    {a.sessions?.status && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                        a.sessions.status === "active" ? "bg-green-100 text-green-700" :
                        a.sessions.status === "closed" ? "bg-red-100 text-red-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {a.sessions.status}
                      </span>
                    )}
                  </Link>

                  {/* Status */}
                  <span>
                    {a.submitted_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium whitespace-nowrap">
                        <CheckCircle2 size={13} /> Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium whitespace-nowrap">
                        <Clock size={13} /> Pending
                      </span>
                    )}
                  </span>

                  {/* Remind */}
                  {!a.submitted_at ? (
                    <form action={sendReminders.bind(null, a.session_id)}>
                      <button
                        type="submit"
                        title="Send reminder to this session's pending attendees"
                        className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2 transition-colors touch-manipulation whitespace-nowrap"
                      >
                        Remind all
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-gray-200">—</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
