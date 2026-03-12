"use client";

import { useState, useTransition } from "react";
import { addAttendee, addAttendeesFromCSV } from "@/app/admin/sessions/actions";
import { Loader2, UserPlus, Upload } from "lucide-react";

interface Props {
  sessionId: string;
}

export function AddAttendeeForm({ sessionId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addAttendee(sessionId, fd);
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
      <input
        name="name"
        type="text"
        required
        placeholder="Full name"
        className="flex-1 min-w-32 border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="email@example.com"
        className="flex-1 min-w-48 border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60 transition-colors shrink-0"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        Add
      </button>
    </form>
  );
}

export function CSVUploadForm({ sessionId }: Props) {
  const [show, setShow] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const file = fd.get("file") as File | null;
    if (file && file.size > 0) {
      // Read file then submit
      const reader = new FileReader();
      reader.onload = () => {
        const newFd = new FormData();
        newFd.set("csv", reader.result as string);
        startTransition(() => addAttendeesFromCSV(sessionId, newFd));
      };
      reader.readAsText(file);
    } else {
      // Use textarea value
      startTransition(() => addAttendeesFromCSV(sessionId, fd));
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-orange-700 font-medium transition-colors"
      >
        <Upload size={14} />
        Bulk import CSV
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-stone-50 p-4 border border-stone-200">
      <p className="text-xs text-stone-500 font-medium">
        CSV format: <code className="bg-stone-100 px-1">Full Name, email@example.com</code> — one per line
      </p>

      {/* File upload */}
      <input
        name="file"
        type="file"
        accept=".csv,text/csv"
        className="block w-full text-sm text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-stone-200 file:text-stone-700 file:text-sm file:font-medium cursor-pointer"
      />

      <p className="text-xs text-stone-400 text-center">— or paste directly —</p>

      {/* Paste area */}
      <textarea
        name="csv"
        rows={4}
        placeholder={"Alice Smith, alice@example.com\nBob Jones, bob@example.com"}
        className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          Import
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
