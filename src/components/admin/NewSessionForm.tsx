"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/app/admin/sessions/actions";
import { Plus, Trash2, GripVertical, Loader2, Sparkles } from "lucide-react";

interface Props {
  error?: string;
}

export default function NewSessionForm({ error }: Props) {
  const [questions, setQuestions] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function generateQuestions() {
    if (!description.trim() || description.trim().length < 10) {
      setGenerateError("Please write at least 10 characters describing your session");
      return;
    }

    setIsGenerating(true);
    setGenerateError("");

    try {
      const res = await fetch("/api/session/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data = (await res.json()) as { questions?: string[]; error?: string };

      if (!res.ok || !data.questions) {
        setGenerateError(data.error ?? "Failed to generate questions");
        return;
      }

      setQuestions(data.questions);
      setGenerateError("");
    } catch (err) {
      setGenerateError("Network error. Please try again or write questions manually.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }

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

      {/* Description for AI — optional */}
      <div>
        <label className="block font-mono text-[10px] text-stone-400 uppercase tracking-[0.18em] mb-1.5">
          Session description <span className="text-stone-300">(optional — for AI question generation)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your session topic, goals, and what feedback you want. E.g., 'This is a Q1 marketing webinar covering SEO strategy, paid ads, and content marketing. We want to know what resonated most and what could improve.'"
          className="w-full border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
          rows={4}
        />
        <p className="text-xs text-stone-400 mt-1.5">
          {description.length} / 500 characters
        </p>
      </div>

      {/* Generate Questions Button */}
      {description.trim().length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={generateQuestions}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 bg-orange-100 border border-orange-300 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-60 transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {isGenerating ? "Generating..." : "Generate 5 questions with AI"}
          </button>
        </div>
      )}

      {/* Generate Error */}
      {generateError && (
        <div className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {generateError}
        </div>
      )}

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
