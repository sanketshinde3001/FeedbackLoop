import { type NextRequest, NextResponse } from "next/server";
import { transcribeAudioBuffer } from "@/lib/deepgram";

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("audio");
  const language = String(form.get("language") || "en");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }

  const VALID_LANGUAGES = ["en", "hi", "mr", "ta", "te", "kn", "ml"];
  const selectedLanguage = VALID_LANGUAGES.includes(language) ? language : "en";

  try {
    const buffer = await file.arrayBuffer();
    const result = await transcribeAudioBuffer(buffer, file.type || "audio/webm", selectedLanguage);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Could not transcribe answer" },
        { status: 422 }
      );
    }

    return NextResponse.json({ transcript: result.transcript ?? "" });
  } catch {
    return NextResponse.json(
      { error: "Unable to process audio answer" },
      { status: 500 }
    );
  }
}
