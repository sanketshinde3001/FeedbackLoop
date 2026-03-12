import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, CalendarDays, CheckCircle2, Circle, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Sessions" };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500",
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
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">Admin</p>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Sessions</h1>
        </div>
        <Link
          href="/admin/sessions/new"
          className="inline-flex items-center gap-2 bg-orange-700 text-white text-sm font-semibold px-4 py-2.5 hover:bg-orange-800 transition-colors shrink-0"
        >
          <Plus size={15} />
          New Session
        </Link>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="border border-stone-200 divide-y divide-stone-100 bg-white">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/admin/sessions/${s.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <CalendarDays size={16} className="text-stone-300 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 group-hover:text-orange-700 transition-colors truncate">
                    {s.title}
                  </p>
                  {s.session_date && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      {new Date(s.session_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-4">
                {s.wall_enabled ? (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={13} /> Wall on
                  </span>
                ) : (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-stone-400">
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
                <ArrowRight size={15} className="text-stone-300 group-hover:text-orange-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border border-stone-200 bg-white p-12 text-center">
          <CalendarDays size={36} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-600 font-medium">No sessions yet</p>
          <p className="text-sm text-stone-400 mt-1 mb-5">Create your first session to start collecting feedback</p>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 bg-orange-700 text-white text-sm font-semibold px-5 py-2.5 hover:bg-orange-800 transition-colors"
          >
            <Plus size={15} /> New Session
          </Link>
        </div>
      )}
    </div>
  );
}
