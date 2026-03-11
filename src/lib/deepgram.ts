/**
 * Server-side Deepgram transcription via the pre-recorded audio API.
 * Sends a public video URL and returns the transcript string.
 *
 * Required env var (server-side only — never expose to browser):
 *   DEEPGRAM_API_KEY=your_deepgram_api_key
 *
 * Returns null if:
 *  - DEEPGRAM_API_KEY is not set
 *  - Deepgram returns an error
 *  - Request times out (90 s)
 * Callers should treat null as "transcript unavailable" and continue.
 */
export async function transcribeVideoUrl(
  videoUrl: string
): Promise<string | null> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      // nova-2: best accuracy/speed balance; smart_format adds punctuation
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: videoUrl }),
        // 90 s covers a 5-minute video; Deepgram is typically much faster
        signal: AbortSignal.timeout(90_000),
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
    };

    return (
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? null
    );
  } catch {
    // Network error, timeout, or unexpected shape — don't block submission
    return null;
  }
}
