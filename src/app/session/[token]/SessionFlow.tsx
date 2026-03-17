"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  StopCircle,
  RefreshCw,
  Send,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  VideoOff,
  ChevronRight,
  SkipForward,
  Upload,
} from "lucide-react";
import { uploadVideoToCloudinary } from "@/lib/cloudinary";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "welcome" | "intro" | "emoji" | "recorder" | "preview" | "uploading" | "submitting" | "done";

interface EmojiOption {
  value: string;
  label: string;
  emoji: string;
}

interface LanguageOption {
  value: "en" | "hi" | "mr" | "ta" | "te" | "kn" | "ml";
  label: string;
}

const EMOJI_OPTIONS: EmojiOption[] = [
  { value: "loved_it", label: "Loved it!", emoji: "🔥" },
  { value: "helpful", label: "Very helpful", emoji: "👍" },
  { value: "needs_improvement", label: "Needs improvement", emoji: "🤔" },
  { value: "confused", label: "Confused", emoji: "😕" },
];

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
];

interface Props {
  token: string;
  attendeeId: string;
  sessionId: string;
  attendeeName: string;
  sessionTitle: string;
  questions: string[];
  alreadySubmitted: boolean;
}

interface InterviewPair {
  question: string;
  answer: string;
}

interface InterviewClosingResponse {
  closingText?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getBestMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

function getBestAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
}

// ─── Wrapper card ─────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-lg bg-white border border-stone-200 overflow-hidden">
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SessionFlow({
  token,
  attendeeName,
  sessionTitle,
  questions,
  alreadySubmitted,
}: Props) {
  const [step, setStep] = useState<Step>(alreadySubmitted ? "done" : "welcome");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption["value"]>("en");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [introText, setIntroText] = useState<string | null>(null);
  const [introLoading, setIntroLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewPhase, setInterviewPhase] = useState<"idle" | "preparing" | "asking" | "listening" | "transcribing" | "complete">("idle");
  const [interviewIndex, setInterviewIndex] = useState(0);
  const [isAnswerRecording, setIsAnswerRecording] = useState(false);
  const [qaPairs, setQaPairs] = useState<InterviewPair[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [closingLine, setClosingLine] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null); // actual blob kept for Cloudinary upload
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const interviewRunningRef = useRef(false);
  const stopAnswerRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mixedDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const currentQuestionAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioCacheRef = useRef<Map<number, Promise<string | null>>>(new Map());

  // Cleanup on unmount — stop camera tracks and revoke blob URL
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      audioRef.current?.pause();
      currentQuestionAudioRef.current?.pause();
      audioContextRef.current?.close().catch(() => null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch AI greeting + TTS when entering intro step
  useEffect(() => {
    if (step !== "intro") return;
    setIntroLoading(true);
    setIntroText(null);
    const controller = new AbortController();
    fetch("/api/session/intro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: attendeeName, sessionTitle, questions }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { text?: string; audioDataUrl?: string }) => {
        setIntroText(data.text ?? null);
        if (data.audioDataUrl) {
          const audio = new Audio(data.audioDataUrl);
          audioRef.current = audio;
          audio.play().catch(() => {/* browser blocked autoplay — silent fallback */});
        }
      })
      .catch(() => {/* network error — user can still proceed */})
      .finally(() => setIntroLoading(false));
    return () => {
      controller.abort();
      audioRef.current?.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mixedDestinationRef.current = null;
    audioContextRef.current?.close().catch(() => null);
    audioContextRef.current = null;
  }

  async function buildInterviewRecordingStream(baseStream: MediaStream): Promise<MediaStream> {
    const audioTrack = baseStream.getAudioTracks()[0];
    const videoTrack = baseStream.getVideoTracks()[0];
    if (!audioTrack || !videoTrack) throw new Error("Camera and microphone are required.");

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const micSource = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    micSource.connect(destination);

    audioContextRef.current = audioContext;
    mixedDestinationRef.current = destination;

    const combined = new MediaStream();
    combined.addTrack(videoTrack);
    destination.stream.getAudioTracks().forEach((t) => combined.addTrack(t));
    return combined;
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Cap resolution so low-end phones don't run out of memory mid-recording
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera & microphone access was denied. Please allow permissions in your browser settings."
          : err instanceof DOMException && err.name === "NotFoundError"
          ? "No camera found on this device."
          : "Could not access camera. Make sure no other app is using it.";
      setCameraError(msg);
    }
  }, []);

  // Start camera whenever recorder step is active
  useEffect(() => {
    if (step === "recorder") {
      startCamera();
    } else {
      // Stop tracks when leaving recorder (preview uses blob URL, not stream)
      stopStream();
    }
  }, [step, startCamera]);

  // Force browser to load blob URL after preview mounts
  useEffect(() => {
    if (step === "preview" && previewVideoRef.current && previewUrl) {
      previewVideoRef.current.load();
    }
  }, [step, previewUrl]);

  // ── Recording ─────────────────────────────────────────────────────────────
  function startRecording(recordStream?: MediaStream) {
    const streamToRecord = recordStream ?? streamRef.current;
    if (!streamToRecord || !cameraReady) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    chunksRef.current = [];
    blobRef.current = null;
    const mimeType = getBestMimeType();
    const recorder = new MediaRecorder(streamToRecord, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      blobRef.current = blob; // keep for Cloudinary upload
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      stopStream();
      setStep("preview");
    };

    recorder.start(500);
    recorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((t) => {
        if (t >= 299) {
          stopRecording();
          return t;
        }
        return t + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  async function fetchQuestionAudioDataUrl(text: string): Promise<string | null> {
    try {
      const res = await fetch("/api/session/question-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { audioDataUrl?: string };
      return data.audioDataUrl ?? null;
    } catch {
      return null;
    }
  }

  async function preloadInitialQuestionAudio(): Promise<void> {
    if (!questions.length) return;
    ensureQuestionAudioPrefetch(0);
    ensureQuestionAudioPrefetch(1);
    const tasks = [
      questionAudioCacheRef.current.get(0),
      questionAudioCacheRef.current.get(1),
    ].filter((p): p is Promise<string | null> => Boolean(p));
    await Promise.allSettled(tasks);
  }

  async function generateInterviewClosingLine(pairs: InterviewPair[]): Promise<string | null> {
    try {
      const res = await fetch("/api/session/interview-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName,
          sessionTitle,
          qa_pairs: pairs,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as InterviewClosingResponse;
      const text = data.closingText?.trim();
      return text || null;
    } catch {
      return null;
    }
  }

  async function playInterviewText(text: string, preloadedAudioDataUrl?: string | null, isClosing = false): Promise<void> {
    const audioDataUrl = preloadedAudioDataUrl ?? (await fetchQuestionAudioDataUrl(text));
    if (!audioDataUrl) {
      const fallbackWait = isClosing ? 3500 : 900;
      if (isClosing) console.warn("[closing] TTS generation failed, waiting fallback duration");
      await new Promise((r) => setTimeout(r, fallbackWait));
      return;
    }

    await audioContextRef.current?.resume().catch(() => null);

    await new Promise<void>((resolve) => {
      const audio = new Audio(audioDataUrl);
      currentQuestionAudioRef.current = audio;
      if (isClosing) console.log("[closing] TTS audio created, starting playback");

      let sourceNode: MediaElementAudioSourceNode | null = null;
      if (audioContextRef.current && mixedDestinationRef.current) {
        try {
          sourceNode = audioContextRef.current.createMediaElementSource(audio);
          sourceNode.connect(mixedDestinationRef.current);
          sourceNode.connect(audioContextRef.current.destination);
        } catch {
          sourceNode = null;
        }
      }

      const done = () => {
        if (isClosing) console.log("[closing] TTS playback finished");
        sourceNode?.disconnect();
        currentQuestionAudioRef.current = null;
        resolve();
      };

      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }

  function ensureQuestionAudioPrefetch(index: number) {
    if (index < 0 || index >= questions.length) return;
    if (questionAudioCacheRef.current.has(index)) return;
    questionAudioCacheRef.current.set(index, fetchQuestionAudioDataUrl(questions[index]));
  }

  async function playInterviewQuestion(index: number): Promise<void> {
    ensureQuestionAudioPrefetch(index);
    ensureQuestionAudioPrefetch(index + 1);
    ensureQuestionAudioPrefetch(index + 2);

    const audioDataUrl = (await questionAudioCacheRef.current.get(index)) ?? null;
    const text = questions[index] ?? "";
    if (text) {
      await playInterviewText(text, audioDataUrl);
      return;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  async function captureSingleAnswer(maxMs = 45_000): Promise<Blob | null> {
    if (!streamRef.current) return null;
    const micTrack = streamRef.current.getAudioTracks()[0];
    if (!micTrack) return null;

    const answerStream = new MediaStream([micTrack.clone()]);
    const chunks: Blob[] = [];
    const mimeType = getBestAudioMimeType();

    return new Promise<Blob | null>((resolve) => {
      const recorder = new MediaRecorder(answerStream, { mimeType });
      let finished = false;
      let silenceRaf: number | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let vadContext: AudioContext | null = null;
      let vadSource: MediaStreamAudioSourceNode | null = null;
      let analyser: AnalyserNode | null = null;
      const pcm = new Uint8Array(2048);
      const threshold = 0.02;
      const minSpeechMs = 450;
      const silenceToStopMs = 1600;
      let speechStartedAt = 0;
      let lastLoudAt = 0;

      const cleanupVad = () => {
        if (silenceRaf !== null) cancelAnimationFrame(silenceRaf);
        silenceRaf = null;
        analyser?.disconnect();
        vadSource?.disconnect();
        analyser = null;
        vadSource = null;
        vadContext?.close().catch(() => null);
        vadContext = null;
      };

      const finalize = () => {
        if (finished) return;
        finished = true;
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        cleanupVad();
        setIsAnswerRecording(false);
        stopAnswerRef.current = null;
        answerStream.getTracks().forEach((t) => t.stop());
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = chunks.length ? new Blob(chunks, { type: mimeType }) : null;
        finalize();
        resolve(blob);
      };

      recorder.onerror = () => {
        finalize();
        resolve(null);
      };

      recorder.start(250);
      setIsAnswerRecording(true);

      stopAnswerRef.current = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };

      timeoutId = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, maxMs);

      try {
        vadContext = new AudioContext();
        vadSource = vadContext.createMediaStreamSource(answerStream);
        analyser = vadContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.2;
        vadSource.connect(analyser);

        const watchSilence = () => {
          if (!analyser || recorder.state === "inactive") return;

          analyser.getByteTimeDomainData(pcm);
          let sum = 0;
          for (let i = 0; i < pcm.length; i += 1) {
            const v = (pcm[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / pcm.length);
          const now = performance.now();

          if (rms > threshold) {
            if (!speechStartedAt) speechStartedAt = now;
            lastLoudAt = now;
          }

          const hasSpoken = speechStartedAt > 0 && now - speechStartedAt >= minSpeechMs;
          const longSilenceAfterSpeech = hasSpoken && lastLoudAt > 0 && now - lastLoudAt >= silenceToStopMs;

          if (longSilenceAfterSpeech) {
            if (recorder.state === "recording") recorder.stop();
            return;
          }

          silenceRaf = requestAnimationFrame(watchSilence);
        };

        silenceRaf = requestAnimationFrame(watchSilence);
      } catch {
        // If VAD setup fails, fallback still works via manual stop + max timeout.
      }
    });
  }

  async function transcribeAnswer(answerBlob: Blob): Promise<string> {
    const MAX_CLIENT_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_CLIENT_RETRIES; attempt += 1) {
      if (attempt > 0) {
        // Back-off before retry: 1 s, 2 s — invisible to user
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
      try {
        const form = new FormData();
        form.append("audio", answerBlob, "answer.webm");
        form.append("language", selectedLanguage);

        const res = await fetch("/api/session/transcribe-answer", {
          method: "POST",
          body: form,
        });

        if (res.ok) {
          const data = (await res.json()) as { transcript?: string };
          const text = (data.transcript ?? "").trim();
          if (text) return text; // success
          // Empty transcript on 200 — treat as soft failure, retry
        }
        // HTTP error or empty → retry on next iteration
      } catch {
        // Network / fetch error → retry
      }
    }
    // All client-side attempts exhausted — interview continues silently
    console.warn("[interview] transcription failed for one answer after retries");
    return "";
  }

  async function runInterviewFlow() {
    if (interviewRunningRef.current) return;

    interviewRunningRef.current = true;
    setInterviewStarted(true);
    setInterviewPhase("preparing");
    setSubmitError(null);
    setQaPairs([]);
    setCurrentPrompt("");
    setInterviewIndex(0);
    questionAudioCacheRef.current.clear();

    try {
      if (!streamRef.current) {
        await startCamera();
      }

      if (!streamRef.current) {
        throw new Error("Could not access camera and microphone.");
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);

      const mixedStream = await buildInterviewRecordingStream(streamRef.current);
      await preloadInitialQuestionAudio();
      startRecording(mixedStream);

      const pairs: InterviewPair[] = [];
      const pendingPairs: Array<InterviewPair | null> = Array.from({ length: questions.length }, () => null);
      const transcriptionTasks: Promise<void>[] = [];
      for (let i = 0; i < questions.length; i += 1) {
        setInterviewIndex(i);
        setInterviewPhase("asking");
        setCurrentPrompt(questions[i] ?? "");
        await playInterviewQuestion(i);

        setInterviewPhase("listening");
        const answerBlob = await captureSingleAnswer();

        const pairTask = (async () => {
          const answer = answerBlob ? await transcribeAnswer(answerBlob) : "";
          const pair = {
            question: questions[i],
            answer: answer || "No clear answer captured.",
          };
          pendingPairs[i] = pair;
          setQaPairs(pendingPairs.filter((p): p is InterviewPair => p !== null));
        })();
        transcriptionTasks.push(pairTask);

        if (i < questions.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setInterviewPhase("transcribing");
      await Promise.all(transcriptionTasks);
      for (let i = 0; i < pendingPairs.length; i += 1) {
        const pair = pendingPairs[i];
        if (pair) pairs.push(pair);
      }
      setQaPairs(pairs);

      const spokenClosing = await generateInterviewClosingLine(pairs);
      const fallbackClosing = `Thanks ${attendeeName}, your feedback for ${sessionTitle} is complete. We appreciate your time.`;
      const finalClosing = spokenClosing || fallbackClosing;
      setClosingLine(finalClosing);
      setCurrentPrompt(finalClosing);

      setInterviewPhase("asking");
      await playInterviewText(finalClosing, undefined, true);

      setInterviewPhase("complete");
      stopRecording();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Interview flow failed. Please try again.");
      setInterviewPhase("idle");
      if (isRecording) stopRecording();
    } finally {
      interviewRunningRef.current = false;
      setIsAnswerRecording(false);
      stopAnswerRef.current = null;
      questionAudioCacheRef.current.clear();
    }
  }

  // ── Re-record ─────────────────────────────────────────────────────────────
  function handleReRecord() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    blobRef.current = null;
    setRecordingTime(0);
    setSubmitError(null);
    setInterviewStarted(false);
    setInterviewPhase("idle");
    setInterviewIndex(0);
    setQaPairs([]);
    setCurrentPrompt("");
    questionAudioCacheRef.current.clear();
    setStep("recorder");
  }

  // ── Submit (video + emoji) ────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitError(null);
    setUploadProgress(0);

    let videoUrl: string | null = null;

    // 1. Upload to Cloudinary if we have a recording
    if (blobRef.current) {
      setStep("uploading");
      try {
        // Returns null when NEXT_PUBLIC_CLOUDINARY_* env vars aren't set yet
        videoUrl = await uploadVideoToCloudinary(blobRef.current, setUploadProgress);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
        setStep("preview");
        return;
      }
    }

    // 2. Save via our API — Deepgram transcript runs server-side
    setStep("submitting");
    try {
      const res = await fetch("/api/session/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          emoji_type: selectedEmoji,
          video_url: videoUrl,
          audio_language: selectedLanguage,
          qa_pairs: qaPairs,
        }),
      });

      const data = (await res.json()) as { error?: string; closing_line?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Submission failed. Please try again.");
      }

      setClosingLine(data.closing_line ?? null);

      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("preview");
    }
  }

  // ── Submit (emoji only — skip video) ─────────────────────────────────────
  async function handleEmojiOnlySubmit() {
    setStep("submitting");
    setSubmitError(null);

    try {
      const res = await fetch("/api/session/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, emoji_type: selectedEmoji, audio_language: selectedLanguage }),
      });

      const data = (await res.json()) as { error?: string; closing_line?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Submission failed.");
      }

      setClosingLine(data.closing_line ?? null);

      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("emoji");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREENS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Uploading video ───────────────────────────────────────────────────────
  if (step === "uploading") {
    return (
      <Card>
        <div className="p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-stone-100 flex items-center justify-center mx-auto">
            <Upload size={28} className="text-stone-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Uploading your video
            </h2>
            <p className="text-sm text-stone-400 mt-1">
              Keep this page open — almost there!
            </p>
          </div>
          <div className="w-full bg-stone-100 h-2 overflow-hidden">
            <div
              className="bg-orange-700 h-2 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-orange-700">
            {uploadProgress}%
          </p>
        </div>
      </Card>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <Card>
        <div className="p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Thank you{alreadySubmitted ? "" : `, ${attendeeName}`}!</h2>
          <p className="text-stone-500">
            {alreadySubmitted
              ? "You've already submitted your feedback for this session."
              : "Your feedback has been recorded. We really appreciate you taking the time!"}
          </p>
          {closingLine && (
            <p className="text-sm text-stone-700 bg-stone-50 border border-stone-200 px-4 py-3 leading-relaxed">
              {closingLine}
            </p>
          )}
          {selectedEmoji && (
            <p className="text-3xl mt-2">
              {EMOJI_OPTIONS.find((e) => e.value === selectedEmoji)?.emoji}
            </p>
          )}
        </div>
      </Card>
    );
  }

  // ── Saving / processing ───────────────────────────────────────────────────
  if (step === "submitting") {
    return (
      <Card>
        <div className="p-10 text-center space-y-4">
          <Loader2 size={36} className="animate-spin text-orange-700 mx-auto" />
          <div>
            <p className="text-stone-700 font-semibold">Saving your feedback…</p>
            <p className="text-sm text-stone-400 mt-1">
              Generating transcript in the background
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // ── Welcome ───────────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <Card>
        <div className="bg-stone-900 px-8 py-6">
          <p className="text-stone-400 text-xs font-mono uppercase tracking-[0.18em]">Feedback for</p>
          <h1 className="text-white text-xl font-bold mt-1.5 leading-tight">
            {sessionTitle}
          </h1>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <p className="text-stone-400 text-sm">Hi there,</p>
            <h2 className="text-2xl font-bold text-stone-900 mt-1">
              Welcome, {attendeeName} 👋
            </h2>
            <p className="text-stone-500 mt-2 text-sm leading-relaxed">
              We&apos;d love to hear your thoughts. You&apos;ll first pick an emoji
              reaction, then record a short video — it only takes a minute.
            </p>
          </div>

          {/* Questions preview */}
          {questions.length > 0 && (
            <div className="bg-stone-50 border border-stone-100 p-4 space-y-2">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-[0.18em]">
                We’ll ask you about…
              </p>
              <ul className="space-y-1">
                {questions.slice(0, 3).map((q, i) => (
                  <li key={i} className="text-sm text-stone-700 flex gap-2">
                    <span className="text-orange-600 font-bold shrink-0">
                      {i + 1}.
                    </span>
                    {q}
                  </li>
                ))}
                {questions.length > 3 && (
                  <li className="text-xs text-stone-400">
                    + {questions.length - 3} more…
                  </li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={() => setStep("intro")}
            className="w-full flex items-center justify-center gap-2 bg-orange-700 px-6 py-4 text-sm font-semibold text-white hover:bg-orange-800 active:scale-[0.98] transition-all touch-manipulation"
          >
            Get Started <ChevronRight size={16} />
          </button>
        </div>
      </Card>
    );
  }

  // ── Intro / AI Guide ──────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <Card>
        <div className="p-8 space-y-6">
          {/* Guide header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-100 flex items-center justify-center shrink-0">
              <Mic size={18} className="text-stone-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">Session Guide</p>
              <p className="text-xs text-stone-400">Personalised for you</p>
            </div>
          </div>

          {/* Message bubble */}
          <div className="min-h-22.5 flex items-start">
            {introLoading ? (
              <div className="flex items-center gap-2 text-stone-400 pt-2">
                <Loader2 size={15} className="animate-spin" />
                <span className="text-sm">One moment…</span>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-100 px-5 py-4">
                <p className="text-sm text-stone-800 leading-relaxed">
                  {introText ??
                    `Hi ${attendeeName}! Ready to record your feedback for ${sessionTitle}? It only takes a couple of minutes.`}
                </p>
              </div>
            )}
          </div>

          {/* Questions reference */}
          {!introLoading && questions.length > 0 && (
            <div className="border-l-2 border-orange-300 pl-4 space-y-1.5">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-[0.18em] mb-2">
                We’ll cover
              </p>
              {questions.map((q, i) => (
                <p key={i} className="text-sm text-stone-600">
                  <span className="text-orange-600 font-bold mr-1.5">{i + 1}.</span>
                  {q}
                </p>
              ))}
            </div>
          )}

          {/* CTA */}
          {!introLoading && (
            <button
              onClick={() => {
                audioRef.current?.pause();
                setStep("emoji");
              }}
              className="w-full flex items-center justify-center gap-2 bg-orange-700 px-6 py-4 text-sm font-semibold text-white hover:bg-orange-800 active:scale-[0.98] transition-all touch-manipulation"
            >
              I’m ready <ChevronRight size={16} />
            </button>
          )}
        </div>
      </Card>
    );
  }

  // ── Emoji ─────────────────────────────────────────────────────────────────
  if (step === "emoji") {
    return (
      <Card>
        <div className="p-8 space-y-6">
          <div>
            <p className="text-xs font-mono text-orange-700 uppercase tracking-[0.18em]">
              Step 1 of 2
            </p>
            <h2 className="text-xl font-bold text-stone-900 mt-1">
              How was the session?
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              Pick the one that best describes your experience.
            </p>
          </div>

          {submitError && (
            <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedEmoji(opt.value)}
                className={`flex flex-col items-center gap-2 border-2 p-5 transition-all ${
                  selectedEmoji === opt.value
                    ? "border-orange-700 bg-orange-50"
                    : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="text-sm font-medium text-stone-700">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => setStep("recorder")}
              disabled={!selectedEmoji}
              className="w-full flex items-center justify-center gap-2 bg-orange-700 px-6 py-4 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all touch-manipulation"
            >
              Continue to Video
              <ChevronRight size={16} />
            </button>

            {selectedEmoji && (
              <button
                onClick={handleEmojiOnlySubmit}
                className="w-full flex items-center justify-center gap-2 border border-stone-200 px-6 py-3 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
              >
                <SkipForward size={15} />
                Submit emoji only (skip video)
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ── Recorder ──────────────────────────────────────────────────────────────
  if (step === "recorder") {
    return (
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-mono text-orange-700 uppercase tracking-[0.18em]">
              Step 2 of 2
            </p>
            <h2 className="text-xl font-bold text-stone-900 mt-1">
              Feedback Recording
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              We will ask each question one by one, record your answer, then move to the next.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-mono text-stone-400 uppercase tracking-[0.18em]">
              Spoken language in your video
            </p>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as LanguageOption["value"])}
              className="w-full border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-400">
              This helps us transcribe non-English feedback more accurately.
            </p>
          </div>

          <div className="border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-stone-500">Progress</p>
              <p className="text-xs text-stone-500">
                {Math.min(interviewIndex + 1, questions.length)} / {questions.length}
              </p>
            </div>
          </div>

          {/* Camera area */}
          {/* 4:3 on mobile (fullscreen-friendly portrait), 16:9 on desktop */}
          <div className="relative bg-stone-900 overflow-hidden aspect-4/3 sm:aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Camera not ready overlay */}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                <Loader2 size={28} className="animate-spin opacity-60" />
                <p className="text-sm opacity-60">Starting camera…</p>
              </div>
            )}

            {/* Camera error */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 px-6 text-center">
                <VideoOff size={28} className="opacity-60" />
                <p className="text-sm opacity-80">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="mt-2 rounded-lg bg-white/20 px-4 py-2 text-sm hover:bg-white/30 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Current question overlay during recording */}
            {interviewStarted && currentPrompt && (
              <div className="absolute inset-x-0 top-0 bg-black/60 px-4 py-4 flex items-center justify-center">
                <p className="text-white text-sm font-medium text-center leading-relaxed">
                  {currentPrompt}
                </p>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-xs font-mono">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {/* 30-second countdown warning */}
            {isRecording && recordingTime >= 270 && (
              <div className="absolute bottom-3 inset-x-3 bg-red-500/80 rounded-lg px-3 py-1.5 text-center">
                <p className="text-white text-xs font-medium">
                  {300 - recordingTime}s remaining
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={runInterviewFlow}
              disabled={interviewStarted || !cameraReady || !!cameraError}
              className="flex-1 min-w-48 flex items-center justify-center gap-2 bg-red-600 px-6 py-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
            >
              <Video size={16} />
              {interviewStarted ? "Feedback running" : "Start Feedback"}
            </button>

            {isAnswerRecording && (
              <button
                onClick={() => stopAnswerRef.current?.()}
                className="flex-1 min-w-48 flex items-center justify-center gap-2 bg-stone-900 px-6 py-4 text-sm font-semibold text-white hover:bg-black transition-colors touch-manipulation"
              >
                <StopCircle size={16} />
                Stop Answer
              </button>
            )}
          </div>

          {/* Permission note */}
          {!cameraReady && !cameraError && (
            <p className="text-xs text-stone-400 text-center flex items-center justify-center gap-1">
              <MicOff size={12} />
              Allow camera & microphone when your browser asks
            </p>
          )}
        </div>
      </Card>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              Preview your recording
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              Happy with it? Submit, or re-record if you want another take.
            </p>
          </div>

          {submitError && (
            <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Video preview — key forces fresh element on new recording */}
          <div className="overflow-hidden bg-stone-900 aspect-4/3 sm:aspect-video">
            <video
              key={previewUrl}
              ref={previewVideoRef}
              src={previewUrl ? previewUrl + "#t=0.001" : undefined}
              controls
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReRecord}
              className="flex items-center gap-2 border border-stone-200 px-5 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <RefreshCw size={15} />
              Re-record
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-orange-800 active:scale-[0.98] transition-all touch-manipulation"
            >
              <Send size={15} />
              Submit Feedback
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
