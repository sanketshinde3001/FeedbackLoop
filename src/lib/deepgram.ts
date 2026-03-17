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

const DEEPGRAM_MODEL = "nova-3";

async function requestDeepgram(
  apiKey: string,
  videoUrl: string,
  opts: { language?: string; withWords?: boolean; detectLanguage?: boolean }
): Promise<DeepgramResponse | null> {
  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    smart_format: "true",
    punctuate: "true",
  });

  if (opts.withWords) {
    params.set("utterances", "true");
  }

  if (opts.detectLanguage) {
    params.set("detect_language", "true");
  } else if (opts.language) {
    params.set("language", opts.language);
  }

  try {
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: videoUrl }),
      signal: AbortSignal.timeout(90_000),
    });

    return (await res.json()) as DeepgramResponse;
  } catch {
    return null;
  }
}

async function requestDeepgramBuffer(
  apiKey: string,
  audioBuffer: ArrayBuffer,
  mimeType: string,
  opts: { language?: string; detectLanguage?: boolean }
): Promise<DeepgramResponse | null> {
  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    smart_format: "true",
    punctuate: "true",
  });

  if (opts.detectLanguage) {
    params.set("detect_language", "true");
  } else if (opts.language) {
    params.set("language", opts.language);
  }

  try {
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType || "audio/webm",
      },
      body: audioBuffer,
      signal: AbortSignal.timeout(45_000),
    });

    return (await res.json()) as DeepgramResponse;
  } catch {
    return null;
  }
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

function extractTranscript(data: DeepgramResponse | null): string | null {
  const t = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  return typeof t === "string" && t.trim().length > 0 ? t.trim() : null;
}

function fallbackLanguageFor(lang: string): string | null {
  const map: Record<string, string> = {
    mr: "hi",
    ta: "en",
    te: "en",
    kn: "en",
    ml: "en",
  };
  return map[lang] ?? null;
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
  videoUrl: string,
  language = "en"
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
    const data = await requestDeepgram(apiKey, videoUrl, { language });
    if (!data) {
      return {
        success: false,
        error: "Transcription error: Network error",
        errorType: "unknown",
      };
    }

    const directTranscript = extractTranscript(data);
    if (directTranscript) {
      return { success: true, transcript: directTranscript };
    }

    // Fallback 1: auto language detection
    const detected = await requestDeepgram(apiKey, videoUrl, { detectLanguage: true });
    const detectedTranscript = extractTranscript(detected);
    if (detectedTranscript) {
      return { success: true, transcript: detectedTranscript };
    }

    // Fallback 2: related fallback language (e.g., mr -> hi)
    const related = fallbackLanguageFor(language);
    if (related && related !== language) {
      const relatedData = await requestDeepgram(apiKey, videoUrl, { language: related });
      const relatedTranscript = extractTranscript(relatedData);
      if (relatedTranscript) {
        return { success: true, transcript: relatedTranscript };
      }
    }

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
  videoUrl: string,
  language = "en"
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
    let data = await requestDeepgram(apiKey, videoUrl, {
      language,
      withWords: true,
    });
    if (!data) {
      return {
        success: false,
        error: "Transcription error: Network error",
        errorType: "unknown",
      };
    }

    const firstTranscript = extractTranscript(data);
    if (!firstTranscript) {
      const detected = await requestDeepgram(apiKey, videoUrl, {
        withWords: true,
        detectLanguage: true,
      });
      const detectedTranscript = extractTranscript(detected);
      if (detected && detectedTranscript) {
        data = detected;
      } else {
        const related = fallbackLanguageFor(language);
        if (related && related !== language) {
          const relatedData = await requestDeepgram(apiKey, videoUrl, {
            withWords: true,
            language: related,
          });
          const relatedTranscript = extractTranscript(relatedData);
          if (relatedData && relatedTranscript) {
            data = relatedData;
          }
        }
      }
    }

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

export async function transcribeAudioBuffer(
  audioBuffer: ArrayBuffer,
  mimeType = "audio/webm",
  language = "en"
): Promise<TranscriptionResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Transcription service not configured",
      errorType: "unknown",
    };
  }

  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    // Exponential back-off: 0 ms, 800 ms, 1600 ms
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }

    try {
      let data = await requestDeepgramBuffer(apiKey, audioBuffer, mimeType, { language });
      if (!data) continue; // network error — retry

      let transcript = extractTranscript(data);

      // Fallback: auto language detection
      if (!transcript) {
        const detected = await requestDeepgramBuffer(apiKey, audioBuffer, mimeType, {
          detectLanguage: true,
        });
        const detectedTranscript = extractTranscript(detected);
        if (detected && detectedTranscript) {
          data = detected;
          transcript = detectedTranscript;
        }
      }

      if (transcript) {
        return { success: true, transcript };
      }

      // If Deepgram returned a hard error (e.g. no audio), don't retry — fail fast
      const parsedError = parseDeepgramError(data);
      if (parsedError?.errorType === "no_audio") {
        return { success: false, ...parsedError };
      }

      // Otherwise loop → retry
    } catch {
      // Transient error — retry on next iteration
    }
  }

  // All attempts exhausted
  return {
    success: false,
    error: "Could not transcribe this answer after multiple attempts.",
    errorType: "unknown",
  };
}
