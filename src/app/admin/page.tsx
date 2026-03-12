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

  const [sessionsRes, attendeesRes, responsesRes, reactionsRes] =
    await Promise.all([
      supabase.from("sessions").select("id", { count: "exact", head: true }),
      supabase.from("attendees").select("id", { count: "exact", head: true }),
      supabase.from("responses").select("id", { count: "exact", head: true }),
      supabase.from("reactions").select("id", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Total Sessions",   value: sessionsRes.count  ?? 0, icon: <CalendarDays size={18} /> },
    { label: "Total Attendees",  value: attendeesRes.count ?? 0, icon: <Users size={18} /> },
    { label: "Video Responses",  value: responsesRes.count ?? 0, icon: <MessageSquareText size={18} /> },
    { label: "Emoji Reactions",  value: reactionsRes.count ?? 0, icon: <Smile size={18} /> },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">Overview</p>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 border border-stone-200">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Quick action */}
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
    </div>
  );
}
