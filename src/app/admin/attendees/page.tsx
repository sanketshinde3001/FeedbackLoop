import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, Clock, Mail, Users, CalendarDays } from "lucide-react";
import Link from "next/link";
import { sendReminderToAttendee } from "@/app/admin/sessions/actions";
import StatusMessage from "@/components/StatusMessage";

export const metadata: Metadata = { title: "Attendees" };

export default async function AttendeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  // Get sessions owned by the current user
  const { data: userSessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("host_id", user.id);

  const userSessionIds = userSessions?.map((s) => s.id) ?? [];

  // Fetch attendees only from user's sessions
  const { data: attendees } = await supabase
    .from("attendees")
    .select("id, name, email, submitted_at, reminded_at, created_at, session_id, sessions(title, status)")
    .in("session_id", userSessionIds.length > 0 ? userSessionIds : ["no-sessions"])
    .order("created_at", { ascending: false });

  const rows = (attendees ?? []) as unknown as Array<{
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
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Attendees</h1>
        <p className="text-sm text-stone-400 mt-1">All attendees across every session</p>
      </div>

      {/* Status Message */}
      <StatusMessage 
        success={params.success} 
        error={params.error} 
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-stone-200 border border-stone-200">
        {[
          { label: "Total", value: total, color: "text-stone-900" },
          { label: "Submitted", value: submitted, color: "text-green-600" },
          { label: "Pending", value: pending, color: "text-amber-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-5 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-stone-200 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Users size={36} className="text-stone-200" />
            <p className="text-sm text-stone-400">No attendees yet - add them from a session</p>
            <Link href="/admin/sessions" className="text-sm text-orange-700 hover:underline">
              Go to Sessions
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_88px_72px] gap-4 px-5 py-3 border-b border-stone-100 font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">
              <span>Name</span>
              <span>Email</span>
              <span>Session</span>
              <span>Status</span>
              <span>Remind</span>
            </div>

            <div className="divide-y divide-stone-50">
              {rows.map((a) => (
                <div
                  key={a.id}
                    className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr_88px_72px] gap-1 sm:gap-4 px-5 py-4 sm:items-center"
                >
                  {/* Name */}
                  <p className="text-sm font-medium text-stone-900 truncate">{a.name}</p>

                  {/* Email */}
                  <p className="text-sm text-stone-500 truncate flex items-center gap-1">
                    <Mail size={12} className="shrink-0 text-stone-300 hidden sm:block" />
                    {a.email}
                  </p>

                  {/* Session */}
                  <Link
                    href={`/admin/sessions/${a.session_id}`}
                    className="text-xs text-orange-700 hover:underline flex items-center gap-1 truncate"
                  >
                    <CalendarDays size={11} className="shrink-0" />
                    {a.sessions?.title ?? "-"}
                    {a.sessions?.status && (
                      <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-medium capitalize rounded-full ${
                        a.sessions.status === "active" ? "bg-green-100 text-green-700" :
                        a.sessions.status === "closed" ? "bg-red-100 text-red-600" :
                        "bg-stone-100 text-stone-500"
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
                      <form action={sendReminderToAttendee.bind(null, a.id)} className="inline-flex items-center">
                      <button
                        type="submit"
                        title="Send reminder email to this attendee"
                        className="text-xs text-stone-400 hover:text-orange-700 underline underline-offset-2 transition-colors touch-manipulation whitespace-nowrap"
                      >
                        Remind
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-stone-200">-</span>
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
