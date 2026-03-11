import type { Metadata } from "next";
import { AuthForm } from "@/components/admin/AuthForm";

export const metadata: Metadata = { title: "Login — FeedbackLoop" };

interface Props {
  searchParams: Promise<{ error?: string; success?: string; mode?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, success, mode } = await searchParams;
  const defaultMode = mode === "signup" ? "signup" : "login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">FeedbackLoop</h1>
          <p className="mt-2 text-sm text-gray-500">Admin Portal</p>
        </div>

        <AuthForm defaultMode={defaultMode} error={error} success={success} />
      </div>
    </div>
  );
}
