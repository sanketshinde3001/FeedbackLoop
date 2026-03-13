import { createAdminClient } from "@/lib/supabase/server";
import TestimonialsGrid, { type EmbedTestimonial } from "@/components/embed/TestimonialsGrid";

interface Props {
  params: Promise<{ hostId: string }>;
  searchParams: Promise<{
    limit?: string;
    accent?: string;
    text?: string;
    card?: string;
    bg?: string;
    template?: string;
  }>;
}

function normalizeColor(input: string | undefined, fallback: string) {
  if (!input) return fallback;
  if (input === "transparent") return "transparent";
  const cleaned = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned;
  return fallback;
}

export default async function EmbedTestimonialsPage({ params, searchParams }: Props) {
  const { hostId } = await params;
  const sp = await searchParams;

  const limit = Number.isFinite(Number(sp.limit)) ? Math.min(Math.max(Number(sp.limit), 1), 24) : 9;
  const accentColor = normalizeColor(sp.accent, "#ea580c");
  const textColor = normalizeColor(sp.text, "#1c1917");
  const cardColor = normalizeColor(sp.card, "#ffffff");
  const backgroundColor = normalizeColor(sp.bg, "transparent");
  const template =
    sp.template === "magazine" || sp.template === "spotlight" || sp.template === "aurora"
      ? sp.template
      : "aurora";

  const supabase = createAdminClient();

  const { data: hostSessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("host_id", hostId)
    .eq("wall_enabled", true);

  const sessionIds = hostSessions?.map((s) => s.id) ?? [];

  if (sessionIds.length === 0) {
    return (
      <main style={{ background: backgroundColor }} className="min-h-screen">
        <TestimonialsGrid
          testimonials={[]}
          template={template}
          textColor={textColor}
          cardColor={cardColor}
          accentColor={accentColor}
          borderColor="rgba(120,113,108,0.25)"
          backgroundColor={backgroundColor}
        />
      </main>
    );
  }

  type RawResponse = {
    id: string;
    attendee_id: string;
    session_id: string;
    video_url: string | null;
    edited_video_url: string | null;
    wall_video_source: "raw" | "edited";
    transcript: string | null;
    attendees: { name: string } | null;
    sessions: { title: string } | null;
  };

  const { data } = await supabase
    .from("responses")
    .select("id, attendee_id, session_id, video_url, edited_video_url, wall_video_source, transcript, attendees(name), sessions(title)")
    .in("session_id", sessionIds)
    .eq("approved_for_wall", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rawRows = (data ?? []) as unknown as RawResponse[];
  const testimonials: EmbedTestimonial[] = rawRows
    .map((r) => {
      const source = r.wall_video_source ?? "raw";
      const chosenVideo = source === "edited" && r.edited_video_url ? r.edited_video_url : r.video_url;
      if (!chosenVideo) return null;
      return {
        id: r.id,
        name: r.attendees?.name ?? "Anonymous",
        sessionTitle: r.sessions?.title ?? "Session",
        videoUrl: chosenVideo,
        transcript: r.transcript,
      };
    })
    .filter((x): x is EmbedTestimonial => Boolean(x));

  return (
    <main style={{ background: backgroundColor }} className="min-h-screen">
      <TestimonialsGrid
        testimonials={testimonials}
        template={template}
        textColor={textColor}
        cardColor={cardColor}
        accentColor={accentColor}
        borderColor="rgba(120,113,108,0.25)"
        backgroundColor={backgroundColor}
      />
    </main>
  );
}
