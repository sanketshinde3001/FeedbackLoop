import type { TranscribedWord } from "@/lib/deepgram";

function toVttTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);

  const pad = (n: number, width = 2) => n.toString().padStart(width, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
}

export function wordsToVtt(words: TranscribedWord[]): string {
  if (!words.length) return "WEBVTT\n\n";

  const lines: string[] = ["WEBVTT", ""];
  let cueIndex = 1;

  for (let i = 0; i < words.length; ) {
    const start = words[i].start;
    let end = words[i].end;
    const chunk: string[] = [];
    let consumed = 0;
    let chars = 0;

    // Reel-style punch: very short cues (1-3 words)
    while (i + consumed < words.length && consumed < 2) {
      const w = words[i + consumed];
      const word = w.word.trim();
      const nextChars = chars + (chars > 0 ? 1 : 0) + word.length;
      if (chars > 0 && nextChars > 14) {
        break;
      }

      chunk.push(word);
      chars = nextChars;
      end = w.end;
      consumed += 1;

      // Break early on punctuation or if cue duration is already punchy enough
      const duration = end - start;
      if (/[.!?]$/.test(word) || duration >= 0.55) {
        break;
      }
    }

    const text = chunk.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      const minEnd = Math.max(end, start + 0.24);
      lines.push(String(cueIndex));
      lines.push(`${toVttTime(start)} --> ${toVttTime(minEnd + 0.04)}`);
      lines.push(text);
      lines.push("");
      cueIndex += 1;
    }

    i += consumed || 1;
  }

  return `${lines.join("\n")}\n`;
}
