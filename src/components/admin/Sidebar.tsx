"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { DM_Serif_Display } from "next/font/google";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart2,
  Code2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const serif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/admin/attendees", label: "Attendees", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/embeds", label: "Embeds", icon: Code2 },
];

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors group relative
                ${collapsed ? "justify-center" : ""}
                ${active
                  ? "bg-orange-700 text-white"
                  : "text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                }`}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
              {/* Tooltip when collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-3 whitespace-nowrap bg-stone-800 text-stone-100 text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-stone-800">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition-colors group relative
              ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={17} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
            {collapsed && (
              <span className="absolute left-full ml-3 whitespace-nowrap bg-stone-800 text-stone-100 text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Sign out
              </span>
            )}
          </button>
        </form>
      </div>
    </>
  );
}

/* ─── Desktop sidebar ─────────────────────────────────────────────────────── */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden sm:flex flex-col min-h-screen bg-stone-900 text-white shrink-0 border-r border-stone-800 transition-all duration-200
        ${collapsed ? "w-14" : "w-56"}`}
    >
      {/* Brand + collapse toggle */}
      <div
        className={`flex items-center border-b border-stone-800 h-14 shrink-0 px-3
          ${collapsed ? "justify-center" : "justify-between"}`}
      >
        {!collapsed && (
          <span className={`${serif.className} text-base tracking-tight truncate pl-1`}>
            FeedbackLoop
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <NavLinks collapsed={collapsed} />
    </aside>
  );
}

/* ─── Mobile top nav + drawer ─────────────────────────────────────────────── */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 text-stone-400 hover:text-stone-900 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 text-white flex flex-col transition-transform duration-200 sm:hidden
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-stone-800 shrink-0">
          <span className={`${serif.className} text-base tracking-tight`}>FeedbackLoop</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-stone-400 hover:text-stone-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <NavLinks collapsed={false} onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
