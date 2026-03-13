export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  words?: TranscribedWord[];
  error?: string;
  errorType?: "no_audio" | "auto_parse" | "unknown";
}

export interface TranscribedWord {
  word: string;
  start: number;
  end: number;
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: Array<{
          word?: string;
          start?: number;
          end?: number;
        }>;
      }>;
    }>;
  };
  error?: {
    message?: string;
    type?: string;
  };
}

function parseDeepgramError(data: DeepgramResponse): Pick<TranscriptionResult, "error" | "errorType"> | null {
  if (!data.error) return null;

  const errorMsg = data.error.message || "Unknown error";
  const lower = errorMsg.toLowerCase();
  const isNoAudio =
    lower.includes("no audio") ||
    lower.includes("unable to detect") ||
    lower.includes("no speech") ||
    data.error.type === "auto_parse";

  return {
    error: isNoAudio
      ? "This video doesn't contain any audio. Please upload a video with audio."
      : `Transcription failed: ${errorMsg}`,
    errorType: isNoAudio ? "no_audio" : "unknown",
  };
}

function parseWords(data: DeepgramResponse): TranscribedWord[] {
  const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  return words
    .filter((w) => typeof w.word === "string" && typeof w.start === "number" && typeof w.end === "number")
    .map((w) => ({ word: w.word as string, start: w.start as number, end: w.end as number }));
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

    const data = (await res.json()) as DeepgramResponse;

    const parsedError = parseDeepgramError(data);
    if (parsedError) {
      return { success: false, ...parsedError };
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

export async function transcribeVideoUrlWithWords(
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
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en&utterances=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: videoUrl }),
        signal: AbortSignal.timeout(90_000),
      }
    );

    const data = (await res.json()) as DeepgramResponse;
    const parsedError = parseDeepgramError(data);
    if (parsedError) {
      return { success: false, ...parsedError };
    }

    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    const words = parseWords(data);

    if (!transcript) {
      return {
        success: false,
        error: "This video doesn't contain any audio. Please upload a video with audio.",
        errorType: "no_audio",
      };
    }

    return { success: true, transcript, words };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: `Transcription error: ${message}`,
      errorType: "unknown",
    };
  }
}
