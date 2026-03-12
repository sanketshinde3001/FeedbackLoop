import Link from "next/link";
import type { Metadata } from "next";
import { DM_Serif_Display } from "next/font/google";

const serif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "FeedbackLoop — Video feedback from your webinar attendees",
  description:
    "Send attendees a private link, they record a short video, you get transcripts, sentiment analysis, and a public testimonial wall.",
};

export default function Home() {
  return (
    <div className={`min-h-screen bg-stone-100 text-stone-900 ${serif.variable}`}>
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 sm:px-14 py-5 border-b border-stone-300">
        <span className={`${serif.className} text-lg tracking-tight`}>FeedbackLoop</span>
        <Link
          href="/admin/login"
          className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
        >
          Admin login →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="px-6 sm:px-14 pt-16 pb-14 sm:pt-28 sm:pb-20 border-b border-stone-300">
        <p className="font-mono text-[10px] text-stone-400 tracking-[0.25em] uppercase mb-10">
          Video feedback platform
        </p>
        <h1
          className={`${serif.className} text-[clamp(3rem,9vw,7rem)] leading-[1.04] tracking-tight max-w-4xl`}
        >
          Your webinar ended.{" "}
          <span className="italic">Their&nbsp;opinions&nbsp;didn&rsquo;t.</span>
        </h1>
      </section>

      {/* ── Body copy + CTA ── */}
      <section className="px-6 sm:px-14 py-14 sm:py-20 border-b border-stone-300 grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-12 sm:gap-24">
        <div className="space-y-5 text-stone-600 text-[15px] leading-[1.75] max-w-xl">
          <p>
            You ran a session. Attendees had thoughts — doubts, praise, follow-up questions. Most
            of it vanished into the chat and was never heard from again.
          </p>
          <p>
            FeedbackLoop sends each attendee a private link. They record a short video directly in
            the browser — no app, no sign-up. You get a word-for-word transcript, a sentiment
            score, and an AI-generated summary of everything they said.
          </p>
          <p>
            Approve a response and it appears on a public testimonial wall. Everything else stays
            private.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <Link
            href="/admin/login"
            className="self-start bg-orange-700 text-white text-sm font-semibold px-7 py-3.5 hover:bg-orange-800 transition-colors"
          >
            Create an account →
          </Link>
          <p className="font-mono text-[11px] text-stone-400 uppercase tracking-widest">
            Free. No credit card.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 sm:px-14 py-14 sm:py-20 border-b border-stone-300">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
          {[
            {
              n: "01",
              title: "Send",
              body: "Add a CSV or paste emails. FeedbackLoop generates a private link for each attendee and sends the invite.",
            },
            {
              n: "02",
              title: "Record",
              body: "They click the link on any device. An AI guide walks them through your questions. They record a short video, right in the browser.",
            },
            {
              n: "03",
              title: "Read",
              body: "Transcripts, sentiment scores, and an AI session summary are waiting. Approve responses for your testimonial wall — one click.",
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="py-10 sm:py-0 sm:px-10 first:pt-0 sm:first:pl-0 last:sm:pr-0 space-y-4">
              <p className="font-mono text-[10px] text-stone-400 tracking-[0.2em]">{n}</p>
              <div className="w-6 border-t border-stone-500" />
              <h3 className={`${serif.className} text-2xl`}>{title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="px-6 sm:px-14 py-14 sm:py-20 border-b border-stone-300">
        <p className="font-mono text-[10px] text-stone-400 tracking-[0.25em] uppercase mb-10">
          What you get
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-20 max-w-3xl">
          {[
            "Video response from every attendee",
            "Word-for-word transcript, automatically",
            "Sentiment rating — positive, neutral, or negative",
            "One-click AI summary of the full session",
            "Public testimonial wall, toggle on or off",
            "Reminder emails for anyone who hasn't responded",
          ].map((item) => (
            <div
              key={item}
              className="flex items-baseline gap-3 py-3 border-b border-stone-200 last:border-0"
            >
              <span className="text-orange-700 font-mono text-xs shrink-0 select-none">→</span>
              <span className="text-stone-700 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 sm:px-14 py-24 sm:py-36 text-center space-y-6">
        <h2 className={`${serif.className} text-4xl sm:text-6xl tracking-tight`}>
          Start listening.
        </h2>
        <p className="text-stone-500 text-sm max-w-xs mx-auto leading-relaxed">
          Takes about ten minutes to set up your first session and send your first batch of invites.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/login"
            className="inline-block bg-orange-700 text-white text-sm font-semibold px-9 py-4 hover:bg-orange-800 transition-colors"
          >
            Get started →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 sm:px-14 py-5 border-t border-stone-300 flex items-center justify-between">
        <span className={`${serif.className} text-sm text-stone-400`}>FeedbackLoop</span>
        <span className="font-mono text-[10px] text-stone-300 tracking-widest">2026</span>
      </footer>
    </div>
  );
}

