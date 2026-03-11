import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import SessionFlow from "./SessionFlow";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = { title: "Leave Feedback" };

// Token is 64 hex characters (32 random bytes)
const TOKEN_REGEX = /^[a-f0-9]{64}$/;

export default async function SessionPage({ params }: Props) {
  const { token } = await params;

  if (!TOKEN_REGEX.test(token)) notFound();

  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("validate_attendee_token", {
    p_token: token,
  });

  if (error || !data || data.length === 0) notFound();

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
