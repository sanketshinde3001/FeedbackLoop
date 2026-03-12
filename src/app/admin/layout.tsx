import { DM_Serif_Display } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileNav } from "@/components/admin/Sidebar";

const serif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user, just render children (e.g. the login page).
  // Middleware already redirects unauthenticated requests to /admin/login;
  // adding another redirect here creates an infinite loop because the layout
  // also wraps the login page itself.
  if (!user) {
    return <>{children}</>;
  }

  const initial = user.email?.[0]?.toUpperCase() ?? "A";

  return (
    <div className={`flex min-h-screen bg-stone-100 text-stone-900 ${serif.variable}`}>
      {/* Desktop sidebar */}
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-stone-900 border-b border-stone-800">
          {/* Mobile: hamburger + brand */}
          <div className="flex items-center gap-3">
            <MobileNav />
            <span className={`${serif.className} text-base text-white tracking-tight sm:hidden`}>
              FeedbackLoop
            </span>
          </div>

          {/* User pill */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-stone-400 hidden sm:block truncate max-w-44">
              {user.email}
            </span>
            <div className="h-7 w-7 rounded-full bg-orange-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
