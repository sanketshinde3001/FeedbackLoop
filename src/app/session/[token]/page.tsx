import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import SessionFlow from "./SessionFlow";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = { title: "Leave Feedback" };

const TOKEN_REGEX = /^[a-f0-9]{64}$/;

function InfoScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">⏳</div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </main>
  );
}

export default async function SessionPage({ params }: Props) {
  const { token } = await params;

  if (!TOKEN_REGEX.test(token)) notFound();

  const supabase = createAdminClient();

  // First try active sessions (normal path)
  const { data, error } = await supabase.rpc("validate_attendee_token", {
    p_token: token,
  });

  if (!error && data && data.length > 0) {
    const session = data[0];
    return (
      <main className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-10">
        <SessionFlow
          token={token}
          attendeeId={session.attendee_id}
          sessionId={session.session_id}
          attendeeName={session.attendee_name}
          sessionTitle={session.session_title}
          questions={session.questions}
          alreadySubmitted={!!session.submitted_at}
        />
      </main>
    );
  }

  // Token exists but session isn't active — check why
  const { data: attendeeRow } = await supabase
    .from("attendees")
    .select("session_id")
    .eq("unique_token", token)
    .single();

  if (!attendeeRow) notFound();

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("status, title")
    .eq("id", attendeeRow.session_id)
    .single();

  if (!sessionRow) notFound();

  if (sessionRow.status === "draft") {
    return (
      <InfoScreen
        title="Session not open yet"
        message={`"${sessionRow.title}" hasn't started accepting feedback yet. Check back soon or ask the organiser when the session opens.`}
      />
    );
  }

  if (sessionRow.status === "closed") {
    return (
      <InfoScreen
        title="Session closed"
        message={`"${sessionRow.title}" is no longer accepting feedback. Thank you for your interest!`}
      />
    );
  }

  notFound();
}
