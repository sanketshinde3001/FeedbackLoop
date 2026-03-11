import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays,
  Users,
  MessageSquareText,
  Smile,
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
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch summary counts in parallel
  const [sessionsRes, attendeesRes, responsesRes, reactionsRes] =
    await Promise.all([
      supabase.from("sessions").select("id", { count: "exact", head: true }),
      supabase.from("attendees").select("id", { count: "exact", head: true }),
      supabase.from("responses").select("id", { count: "exact", head: true }),
      supabase.from("reactions").select("id", { count: "exact", head: true }),
    ]);

  const stats = [
    {
      label: "Total Sessions",
      value: sessionsRes.count ?? 0,
      icon: <CalendarDays size={20} />,
    },
    {
      label: "Total Attendees",
      value: attendeesRes.count ?? 0,
      icon: <Users size={20} />,
    },
    {
      label: "Video Responses",
      value: responsesRes.count ?? 0,
      icon: <MessageSquareText size={20} />,
    },
    {
      label: "Emoji Reactions",
      value: reactionsRes.count ?? 0,
      icon: <Smile size={20} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of all your feedback sessions
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Empty state placeholder — sessions list comes in next step */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <CalendarDays
          size={40}
          className="mx-auto text-gray-300 mb-3"
        />
        <p className="text-gray-500 font-medium">No sessions yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Create your first session to get started
        </p>
      </div>
    </div>
  );
}
