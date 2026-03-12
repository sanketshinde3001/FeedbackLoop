"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface StatusMessageProps {
  success?: string;
  error?: string;
}

export default function StatusMessage({ success, error }: StatusMessageProps) {
  useEffect(() => {
    if (success || error) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [success, error]);

  if (!success && !error) return null;

  return (
    <div className="mb-6">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded px-4 py-3 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{decodeURIComponent(success)}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      )}
    </div>
  );
}
