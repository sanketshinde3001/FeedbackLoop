"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/app/admin/sessions/actions";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";

interface Props {
  error?: string;
}

export default function NewSessionForm({ error }: Props) {
  const [questions, setQuestions] = useState<string[]>([""]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function addQuestion() {
    setQuestions((prev) => [...prev, ""]);
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i: number, value: string) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? value : q)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("questions", JSON.stringify(questions));
    startTransition(() => createSession(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-1.5">
          Session title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          placeholder="e.g. Q1 2026 Marketing Webinar"
          className="w-full border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
        />
      </div>

      {/* Session date */}
      <div>
        <label className="block font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-1.5">
          Session date
        </label>
        <input
          name="session_date"
          type="date"
          className="border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
        />
      </div>

      {/* Questions */}
      <div>
        <label className="block font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-2">
          Questions <span className="text-red-500">*</span>
        </label>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical size={16} className="text-stone-300 shrink-0" />
              <input
                type="text"
                value={q}
                onChange={(e) => updateQuestion(i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="flex-1 border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-orange-700 font-medium transition-colors"
        >
          <Plus size={15} />
          Add question
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 size={15} className="animate-spin" />}
          Create Session
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
