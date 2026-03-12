"use client";

import { useTransition } from "react";
import { updateSessionStatus, toggleWall, deleteSession } from "@/app/admin/sessions/actions";
import { Loader2 } from "lucide-react";

interface Props {
  sessionId: string;
  currentStatus: "draft" | "active" | "closed";
  wallEnabled: boolean;
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

export function SessionControls({ sessionId, currentStatus, wallEnabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const flow = STATUS_FLOW[currentStatus];

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
    <div className="flex flex-wrap items-center gap-3">
      {/* Status toggle */}
      <button
        onClick={handleStatusChange}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${STATUS_STYLES[currentStatus]}`}
      >
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {flow.label}
      </button>

      {/* Wall toggle */}
      <button
        onClick={handleWallToggle}
        disabled={isPending}
        className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 transition-colors"
      >
        {wallEnabled ? "Disable Wall" : "Enable Wall"}
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="ml-auto inline-flex items-center gap-2 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
      >
        Delete Session
      </button>
    </div>
  );
}
