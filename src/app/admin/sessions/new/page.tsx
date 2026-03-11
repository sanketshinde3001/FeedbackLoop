import type { Metadata } from "next";
import NewSessionForm from "@/components/admin/NewSessionForm";

export const metadata: Metadata = { title: "New Session" };

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewSessionPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Session</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up a feedback session and add your questions
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <NewSessionForm error={error} />
      </div>
    </div>
  );
}
