import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import JoinSessionForm from "@/components/session/JoinSessionForm";

interface Props {
  params: Promise<{ sessionId: string }>;
}

function InfoScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">⏳</div>
        <h1 className="text-xl font-bold text-stone-900">{title}</h1>
        <p className="text-sm text-stone-500">{message}</p>
      </div>
    </main>
  );
}

export default async function JoinSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, status")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  if (session.status === "draft") {
    return (
      <InfoScreen
        title="Session not open yet"
        message={`\"${session.title}\" hasn't started accepting feedback yet. Please try again later.`}
      />
    );
  }

  if (session.status === "closed") {
    return (
      <InfoScreen
        title="Session closed"
        message={`\"${session.title}\" is no longer accepting feedback.`}
      />
    );
  }

  return <JoinSessionForm sessionId={session.id} sessionTitle={session.title} />;
}
