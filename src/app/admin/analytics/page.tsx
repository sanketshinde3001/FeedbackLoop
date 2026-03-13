import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BarChart2, TrendingUp, Users, MessageSquare, Smile } from "lucide-react";

export const metadata: Metadata = { title: "Analytics" };

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-500",
  neutral: "bg-stone-400",
  negative: "bg-red-400",
};

const EMOJI_LABELS: Record<string, string> = {
  loved_it: "Loved it",
  helpful: "Helpful",
  needs_improvement: "Needs improvement",
  confused: "Confused",
};

function Bar({ label, value, max, color = "bg-orange-600" }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-500 w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-stone-100 h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-stone-700 w-6 text-right shrink-0">{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 p-5 flex items-start gap-4">
      <div className="p-2 bg-stone-100 text-stone-600 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em]">{label}</p>
        <p className="text-3xl font-bold text-stone-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
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

  const [sessionsRes, attendeesRes, responsesRes, reactionsRes] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title, status, created_at")
      .in("id", userSessionIds.length > 0 ? userSessionIds : ["no-sessions"]),
    supabase
      .from("attendees")
      .select("id, submitted_at, session_id")
      .in("session_id", userSessionIds.length > 0 ? userSessionIds : ["no-sessions"]),
    supabase
      .from("responses")
      .select("id, sentiment, created_at, session_id")
      .in("session_id", userSessionIds.length > 0 ? userSessionIds : ["no-sessions"]),
    supabase
      .from("reactions")
      .select("emoji_type")
      .in("session_id", userSessionIds.length > 0 ? userSessionIds : ["no-sessions"]),
  ]);

  const sessions  = sessionsRes.data  ?? [];
  const attendees = attendeesRes.data ?? [];
  const responses = responsesRes.data ?? [];
  const reactions = reactionsRes.data ?? [];

  const totalSessions   = sessions.length;
  const totalAttendees  = attendees.length;
  const totalResponses  = responses.length;
  const responseRate    = totalAttendees > 0 ? Math.round((totalResponses / totalAttendees) * 100) : 0;
  const activeSessions  = sessions.filter((s) => s.status === "active").length;

  // Sentiment breakdown
  const sentimentCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  responses.forEach((r) => { if (r.sentiment) sentimentCounts[r.sentiment]++; });
  const maxSentiment = Math.max(...Object.values(sentimentCounts), 1);

  // Emoji breakdown
  const emojiCounts: Record<string, number> = {};
  reactions.forEach((r) => {
    emojiCounts[r.emoji_type] = (emojiCounts[r.emoji_type] ?? 0) + 1;
  });
  const maxEmoji = Math.max(...Object.values(emojiCounts), 1);

  // Response rate per session (top 6)
  const sessionStats = sessions
    .map((s) => {
      const att = attendees.filter((a) => a.session_id === s.id).length;
      const sub = attendees.filter((a) => a.session_id === s.id && a.submitted_at).length;
      return { title: s.title, att, sub, rate: att > 0 ? Math.round((sub / att) * 100) : 0 };
    })
    .sort((a, b) => b.att - a.att)
    .slice(0, 6);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div>
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-stone-400 mt-1">Overview across all sessions</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 border border-stone-200">
        <StatCard label="Sessions" value={totalSessions} sub={`${activeSessions} active`} icon={<BarChart2 size={18} />} />
        <StatCard label="Attendees" value={totalAttendees} icon={<Users size={18} />} />
        <StatCard label="Responses" value={totalResponses} icon={<MessageSquare size={18} />} />
        <StatCard label="Response rate" value={`${responseRate}%`} sub="across all sessions" icon={<TrendingUp size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-stone-200 border border-stone-200">
        {/* Sentiment breakdown */}
        <div className="bg-white p-6 space-y-4">
          <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] flex items-center gap-2">
            <TrendingUp size={13} /> Sentiment breakdown
          </h2>
          {totalResponses === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No analyzed responses yet</p>
          ) : (
            <div className="space-y-3 pt-1">
              {Object.entries(sentimentCounts).map(([key, val]) => (
                <Bar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val} max={maxSentiment} color={SENTIMENT_COLORS[key]} />
              ))}
              <p className="text-[11px] text-stone-400 pt-1">
                {responses.filter((r) => !r.sentiment).length} response(s) not yet analyzed
              </p>
            </div>
          )}
        </div>

        {/* Emoji reactions */}
        <div className="bg-white p-6 space-y-4">
          <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] flex items-center gap-2">
            <Smile size={13} /> Emoji reactions
          </h2>
          {reactions.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No reactions yet</p>
          ) : (
            <div className="space-y-3 pt-1">
              {Object.entries(EMOJI_LABELS).map(([key, label]) => (
                <Bar key={key} label={label} value={emojiCounts[key] ?? 0} max={maxEmoji} color="bg-orange-500" />
              ))}
            </div>
          )}
        </div>

        {/* Session response rates */}
        <div className="bg-white p-6 space-y-4 lg:col-span-2">
          <h2 className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] flex items-center gap-2">
            <Users size={13} /> Response rate by session
          </h2>
          {sessionStats.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No sessions yet</p>
          ) : (
            <div className="space-y-5 pt-1">
              {sessionStats.map((s) => (
                <div key={s.title} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-700 font-medium truncate max-w-[60%]">{s.title}</span>
                    <span className="text-stone-400 shrink-0">
                      {s.sub}/{s.att} &middot; <span className="font-semibold text-orange-700">{s.rate}%</span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-1.5 overflow-hidden">
                    <div className="bg-orange-600 h-1.5 transition-all duration-500" style={{ width: `${s.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
