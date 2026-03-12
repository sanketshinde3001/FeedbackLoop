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

const EMOJI_OPTIONS: EmojiOption[] = [
  { value: "loved_it", label: "Loved it!", emoji: "🔥" },
  { value: "helpful", label: "Very helpful", emoji: "👍" },
  { value: "needs_improvement", label: "Needs improvement", emoji: "🤔" },
  { value: "confused", label: "Confused", emoji: "😕" },
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

// ─── Wrapper card ─────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [introText, setIntroText] = useState<string | null>(null);
  const [introLoading, setIntroLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null); // actual blob kept for Cloudinary upload
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount — stop camera tracks and revoke blob URL
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      audioRef.current?.pause();
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
  function startRecording() {
    if (!streamRef.current || !cameraReady) return;

    chunksRef.current = [];
    blobRef.current = null;
    const mimeType = getBestMimeType();
    const recorder = new MediaRecorder(streamRef.current, { mimeType });

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

  // ── Re-record ─────────────────────────────────────────────────────────────
  function handleReRecord() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    blobRef.current = null;
    setRecordingTime(0);
    setSubmitError(null);
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
        body: JSON.stringify({ token, emoji_type: selectedEmoji, video_url: videoUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Submission failed. Please try again.");
      }

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
        body: JSON.stringify({ token, emoji_type: selectedEmoji }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Submission failed.");
      }

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
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
            <Upload size={28} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Uploading your video
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Keep this page open — almost there!
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-indigo-600">
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
          <h2 className="text-2xl font-bold text-gray-900">Thank you{alreadySubmitted ? "" : `, ${attendeeName}`}!</h2>
          <p className="text-gray-500">
            {alreadySubmitted
              ? "You've already submitted your feedback for this session."
              : "Your feedback has been recorded. We really appreciate you taking the time!"}
          </p>
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
          <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto" />
          <div>
            <p className="text-gray-700 font-semibold">Saving your feedback…</p>
            <p className="text-sm text-gray-400 mt-1">
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
        <div className="bg-indigo-600 px-8 py-6">
          <p className="text-indigo-200 text-sm font-medium">Feedback for</p>
          <h1 className="text-white text-xl font-bold mt-1 leading-tight">
            {sessionTitle}
          </h1>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <p className="text-gray-500 text-sm">Hi there,</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              Welcome, {attendeeName} 👋
            </h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              We'd love to hear your thoughts. You'll first pick an emoji
              reaction, then record a short video — it only takes a minute.
            </p>
          </div>

          {/* Questions preview */}
          {questions.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                We'll ask you about…
              </p>
              <ul className="space-y-1">
                {questions.slice(0, 3).map((q, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-indigo-400 font-bold shrink-0">
                      {i + 1}.
                    </span>
                    {q}
                  </li>
                ))}
                {questions.length > 3 && (
                  <li className="text-xs text-gray-400">
                    + {questions.length - 3} more…
                  </li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={() => setStep("intro")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-[0.98] transition-all touch-manipulation"
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
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Mic size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Session Guide</p>
              <p className="text-xs text-gray-400">Personalised for you</p>
            </div>
          </div>

          {/* Message bubble */}
          <div className="min-h-22.5 flex items-start">
            {introLoading ? (
              <div className="flex items-center gap-2 text-gray-400 pt-2">
                <Loader2 size={15} className="animate-spin" />
                <span className="text-sm">One moment…</span>
              </div>
            ) : (
              <div className="bg-indigo-50 rounded-2xl rounded-tl-sm px-5 py-4">
                <p className="text-sm text-indigo-900 leading-relaxed">
                  {introText ??
                    `Hi ${attendeeName}! Ready to record your feedback for ${sessionTitle}? It only takes a couple of minutes.`}
                </p>
              </div>
            )}
          </div>

          {/* Questions reference */}
          {!introLoading && questions.length > 0 && (
            <div className="border-l-2 border-indigo-100 pl-4 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                We’ll cover
              </p>
              {questions.map((q, i) => (
                <p key={i} className="text-sm text-gray-600">
                  <span className="text-indigo-400 font-bold mr-1.5">{i + 1}.</span>
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-[0.98] transition-all touch-manipulation"
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
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
              Step 1 of 2
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              How was the session?
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Pick the one that best describes your experience.
            </p>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedEmoji(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
                  selectedEmoji === opt.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="text-sm font-medium text-gray-700">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => setStep("recorder")}
              disabled={!selectedEmoji}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all touch-manipulation"
            >
              Continue to Video
              <ChevronRight size={16} />
            </button>

            {selectedEmoji && (
              <button
                onClick={handleEmojiOnlySubmit}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
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
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
              Step 2 of 2
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Record your feedback
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Max 5 minutes. Answer as many questions as you like.
            </p>
          </div>

          {/* Questions reference */}
          {questions.length > 0 && (
            <div className="bg-indigo-50 rounded-xl px-4 py-3 space-y-1">
              {questions.map((q, i) => (
                <p key={i} className="text-xs text-indigo-700">
                  <span className="font-bold">{i + 1}.</span> {q}
                </p>
              ))}
            </div>
          )}

          {/* Camera area */}
          {/* 4:3 on mobile (fullscreen-friendly portrait), 16:9 on desktop */}
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-4/3 sm:aspect-video">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
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
          <div className="flex gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!cameraReady || !!cameraError}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-4 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                <Video size={16} />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-sm font-semibold text-white hover:bg-red-500 transition-colors touch-manipulation"
              >
                <StopCircle size={16} />
                Stop &amp; Preview
              </button>
            )}
          </div>

          {/* Permission note */}
          {!cameraReady && !cameraError && (
            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
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
            <h2 className="text-xl font-bold text-gray-900">
              Preview your recording
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Happy with it? Submit, or re-record if you want another take.
            </p>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Video preview — key forces fresh element on new recording */}
          <div className="rounded-2xl overflow-hidden bg-gray-900 aspect-4/3 sm:aspect-video">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
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
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={15} />
              Re-record
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-[0.98] transition-all touch-manipulation"
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
