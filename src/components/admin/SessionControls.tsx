"use client";

import { useTransition } from "react";
import Link from "next/link";
import { updateSessionStatus, toggleWall, deleteSession } from "@/app/admin/sessions/actions";
import { Loader2, Eye } from "lucide-react";

interface Props {
  sessionId: string;
  currentStatus: "draft" | "active" | "closed";
  wallEnabled: boolean;
  appUrl?: string;
}

const STATUS_FLOW: Record<string, { label: string; next: "draft" | "active" | "closed" }> = {
  draft: { label: "Activate Session", next: "active" },
  active: { label: "Close Session", next: "closed" },
  closed: { label: "Reopen as Draft", next: "draft" },
};

const STATUS_STYLES: Record<string, string> = {
  draft:  "bg-orange-700 hover:bg-orange-800",
  active: "bg-red-600 hover:bg-red-700",
  closed: "bg-stone-700 hover:bg-stone-800",
};

export function SessionControls({ sessionId, currentStatus, wallEnabled, appUrl = "http://localhost:3000" }: Props) {
  const [isPending, startTransition] = useTransition();
  const flow = STATUS_FLOW[currentStatus];
  const wallUrl = `${appUrl}/wall/${sessionId}`;

  function handleStatusChange() {
    startTransition(() => updateSessionStatus(sessionId, flow.next));
  }

  function handleWallToggle() {
    startTransition(() => toggleWall(sessionId, !wallEnabled));
  }

  function handleDelete() {
    if (!confirm("Delete this session and all its data? This cannot be undone.")) return;
    startTransition(() => deleteSession(sessionId));
  }

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
      {/* Status toggle */}
      <button
        onClick={handleStatusChange}
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${STATUS_STYLES[currentStatus]}`}
      >
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {flow.label}
      </button>

      {/* Wall toggle */}
      <button
        onClick={handleWallToggle}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 transition-colors"
      >
        {wallEnabled ? "Disable Wall" : "Enable Wall"}
      </button>

      {/* View Wall button — only show when wall is enabled */}
      {wallEnabled && (
        <Link
          href={wallUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
        >
          <Eye size={14} />
          View Wall
        </Link>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors sm:ml-auto"
      >
        Delete Session
      </button>
    </div>
  );
}
