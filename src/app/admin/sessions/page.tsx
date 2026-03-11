import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, CalendarDays, Users, CheckCircle2, Circle } from "lucide-react";

export const metadata: Metadata = { title: "Sessions" };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-600",
};

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, title, status, session_date, wall_enabled, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your webinar feedback sessions
          </p>
        </div>
        <Link
          href="/admin/sessions/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus size={16} />
          New Session
        </Link>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/admin/sessions/${s.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <CalendarDays
                  size={18}
                  className="text-gray-400 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {s.title}
                  </p>
                  {s.session_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.session_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {s.wall_enabled ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={13} /> Wall on
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Circle size={13} /> Wall off
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    STATUS_STYLES[s.status] ?? STATUS_STYLES.draft
                  }`}
                >
                  {s.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <CalendarDays size={42} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No sessions yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Create your first session to start collecting feedback
          </p>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus size={15} />
            New Session
          </Link>
        </div>
      )}
    </div>
  );
}
