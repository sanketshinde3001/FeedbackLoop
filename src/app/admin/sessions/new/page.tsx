import type { Metadata } from "next";
import NewSessionForm from "@/components/admin/NewSessionForm";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New Session" };

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewSessionPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) notFound();

  const { error } = await searchParams;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div>
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">Sessions</p>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">New Session</h1>
        <p className="text-sm text-stone-400 mt-1">
          Set up a feedback session and add your questions
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white border border-stone-200 p-6 sm:p-8">
        <NewSessionForm error={error} />
      </div>
    </div>
  );
}
