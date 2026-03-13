import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EmbedSettings from "@/components/admin/EmbedSettings";

export const metadata: Metadata = { title: "Embed Testimonials" };

export default async function AdminEmbedsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const embedBaseUrl = `${appUrl}/embed/${user.id}`;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div>
        <p className="font-mono text-[10px] text-stone-400 uppercase tracking-[0.25em] mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Embed Testimonials</h1>
        <p className="text-sm text-stone-500 mt-1">
          Paste one URL or iframe code in any website. New approved wall videos auto-appear.
        </p>
      </div>

      <div className="bg-white border border-stone-200 p-4 sm:p-6">
        <EmbedSettings embedBaseUrl={embedBaseUrl} />
      </div>
    </div>
  );
}
