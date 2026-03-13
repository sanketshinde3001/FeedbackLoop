import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays,
  Users,
  MessageSquareText,
  Smile,
  Plus,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
}

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <div className="bg-white border border-stone-200 p-5 flex items-start gap-4">
      <div className="p-2 bg-stone-100 text-stone-600 shrink-0">{icon}</div>
      <div>
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">{label}</p>
        <p className="text-3xl font-bold text-stone-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, title, status, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  if (sessionsError) throw sessionsError;

  const sessionIds = sessions?.map((s) => s.id) ?? [];
  const recentSessions = sessions?.slice(0, 4) ?? [];

  const [attendeeCount, responseCount, reactionCount] = await Promise.all([
    sessionIds.length
      ? supabase
          .from("attendees")
          .select("id", { count: "exact", head: true })
          .in("session_id", sessionIds)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    sessionIds.length
      ? supabase
          .from("responses")
          .select("id", { count: "exact", head: true })
          .in("session_id", sessionIds)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    sessionIds.length
      ? supabase
          .from("reactions")
          .select("id", { count: "exact", head: true })
          .in("session_id", sessionIds)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
  ]);

  const stats = [
    { label: "Total Sessions", value: sessions?.length ?? 0, icon: <CalendarDays size={18} /> },
    { label: "Total Attendees", value: attendeeCount, icon: <Users size={18} /> },
    { label: "Video Responses", value: responseCount, icon: <MessageSquareText size={18} /> },
    { label: "Emoji Reactions", value: reactionCount, icon: <Smile size={18} /> },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div>
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">Overview</p>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-stone-200 border border-stone-200">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {recentSessions.length === 0 ? (
        <div className="border border-stone-200 bg-white p-8 text-center">
          <CalendarDays size={36} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-600 font-medium">No sessions yet</p>
          <p className="text-sm text-stone-400 mt-1 mb-5">
            Create your first session to get started
          </p>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 bg-orange-700 text-white text-sm font-semibold px-5 py-2.5 hover:bg-orange-800 transition-colors"
          >
            <Plus size={15} />
            New Session
          </Link>
        </div>
      ) : (
        <section className="border border-stone-200 bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-lg font-semibold text-stone-900">Recent Sessions</h2>
            <Link
              href="/admin/sessions"
              className="text-sm font-medium text-orange-800 hover:text-orange-900"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin/sessions/${session.id}`}
                className="border border-stone-200 p-4 hover:border-stone-300 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-stone-900 leading-tight line-clamp-2">
                    {session.title ?? "Untitled Session"}
                  </p>
                  <span className="shrink-0 px-2 py-1 text-[10px] uppercase tracking-[0.12em] bg-stone-100 text-stone-600">
                    {session.status ?? "draft"}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
