"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type EmbedTestimonial = {
  id: string;
  name: string;
  sessionTitle: string;
  videoUrl: string;
  transcript: string | null;
};

interface Props {
  testimonials: EmbedTestimonial[];
  template: "aurora" | "magazine" | "spotlight";
  textColor: string;
  cardColor: string;
  accentColor: string;
  borderColor: string;
}

function TestimonialVideo({
  src,
  accentColor,
}: {
  src: string;
  accentColor: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative aspect-video w-full overflow-hidden">
      {shouldLoad && playing ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          autoPlay
          className="h-full w-full object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="relative h-full w-full text-left"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--embed-accent) 72%, #111 28%) 0%, color-mix(in srgb, var(--embed-card) 65%, #000 35%) 100%)",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_100%_0%,rgba(255,255,255,0.24),transparent_55%)]" />
          <div className="relative h-full flex items-end p-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ background: accentColor }}
              >
                ▶
              </span>
              <span className="text-xs text-white/90">Play testimonial</span>
            </div>
          </div>
        </button>
      )}
      {!shouldLoad && (
        <div className="absolute top-2 right-2 rounded-full bg-white/15 px-2 py-1 text-[10px] text-white/85 backdrop-blur-sm">
          Optimized lazy load
        </div>
      )}
    </div>
  );
}

export default function TestimonialsGrid({
  testimonials,
  template,
  textColor,
  cardColor,
  accentColor,
  borderColor,
}: Props) {
  const style = useMemo(
    () =>
      ({
        "--embed-text": textColor,
        "--embed-card": cardColor,
        "--embed-accent": accentColor,
        "--embed-border": borderColor,
      }) as React.CSSProperties,
    [textColor, cardColor, accentColor, borderColor]
  );

  if (testimonials.length === 0) {
    return (
      <section style={style} className="w-full max-w-6xl mx-auto p-4 sm:p-6 text-(--embed-text)">
        <div className="border p-6 text-center" style={{ borderColor: "var(--embed-border)", background: "var(--embed-card)" }}>
          <p className="text-sm opacity-80">No testimonials available yet.</p>
        </div>
      </section>
    );
  }

  const frameClass =
    template === "aurora"
      ? "bg-[linear-gradient(115deg,#fff_0%,#fff7ed_44%,#ffedd5_100%)]"
      : template === "spotlight"
        ? "bg-[linear-gradient(145deg,#ffffff_0%,#f5f5f4_42%,#fff_100%)]"
        : "bg-[linear-gradient(165deg,#ffffff_0%,#f8fafc_100%)]";

  return (
    <section style={style} className={`w-full max-w-6xl mx-auto p-4 sm:p-6 text-(--embed-text) ${frameClass}`}>
      <div className="mb-5 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">What People Say</h2>
        <span className="text-xs opacity-70">Auto-updates as new testimonials are approved</span>
      </div>

      {template === "magazine" ? (
        <div className="space-y-4">
          {testimonials.slice(0, 1).map((hero) => (
            <article
              key={hero.id}
              className="border overflow-hidden md:grid md:grid-cols-[1.05fr_1fr]"
              style={{ borderColor: "var(--embed-border)", background: "var(--embed-card)" }}
            >
              <TestimonialVideo
                src={hero.videoUrl}
                accentColor={accentColor}
              />
              <div className="p-6 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] opacity-60">Featured testimonial</p>
                  <h3 className="text-2xl font-semibold mt-2">{hero.name}</h3>
                  <p className="text-sm opacity-70 mt-1">{hero.sessionTitle}</p>
                </div>
                {hero.transcript && <p className="text-base leading-relaxed line-clamp-5">{hero.transcript}</p>}
              </div>
            </article>
          ))}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(1).map((item) => (
              <article
                key={item.id}
                className="border overflow-hidden"
                style={{ borderColor: "var(--embed-border)", background: "var(--embed-card)" }}
              >
                <TestimonialVideo
                  src={item.videoUrl}
                  accentColor={accentColor}
                />
                <div className="p-3.5 space-y-1.5">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] opacity-70">{item.sessionTitle}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article
              key={item.id}
              className={`border overflow-hidden ${template === "spotlight" ? "shadow-[0_15px_40px_rgba(0,0,0,0.06)]" : ""}`}
              style={{ borderColor: "var(--embed-border)", background: "var(--embed-card)" }}
            >
              <TestimonialVideo
                src={item.videoUrl}
                accentColor={accentColor}
              />
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--embed-text)" }}>
                      {item.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.12em] opacity-70 mt-0.5">{item.sessionTitle}</p>
                  </div>
                  <span className="h-7 w-7 rounded-full grid place-items-center text-white text-xs" style={{ background: accentColor }}>
                    “
                  </span>
                </div>
                {item.transcript && (
                  <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--embed-text)" }}>
                    {item.transcript}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
