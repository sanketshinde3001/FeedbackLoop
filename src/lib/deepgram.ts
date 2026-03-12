export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  error?: string;
  errorType?: "no_audio" | "auto_parse" | "unknown";
}

/**
 * Server-side Deepgram transcription via the pre-recorded audio API.
 * Sends a public video URL and returns the transcript string or error details.
 *
 * Required env var (server-side only — never expose to browser):
 *   DEEPGRAM_API_KEY=your_deepgram_api_key
 *
 * Returns:
 *  - { success: true, transcript: string } on successful transcription
 *  - { success: false, error: string, errorType: "no_audio" } if video has no audio
 *  - { success: false, error: string, errorType: "unknown" } on other errors
 */
export async function transcribeVideoUrl(
  videoUrl: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Transcription service not configured",
      errorType: "unknown",
    };
  }

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

    const data = (await res.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
      error?: {
        message?: string;
        type?: string;
      };
    };

    // Check for Deepgram errors
    if (data.error) {
      const errorMsg = data.error.message || "Unknown error";
      const isNoAudio =
        errorMsg.toLowerCase().includes("no audio") ||
        errorMsg.toLowerCase().includes("unable to detect") ||
        errorMsg.toLowerCase().includes("no speech") ||
        data.error.type === "auto_parse";

      return {
        success: false,
        error: isNoAudio
          ? "This video doesn't contain any audio. Please upload a video with audio."
          : `Transcription failed: ${errorMsg}`,
        errorType: isNoAudio ? "no_audio" : "unknown",
      };
    }

    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    if (!transcript) {
      return {
        success: false,
        error: "This video doesn't contain any audio. Please upload a video with audio.",
        errorType: "no_audio",
      };
    }

    return { success: true, transcript };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: `Transcription error: ${message}`,
      errorType: "unknown",
    };
  }
}
