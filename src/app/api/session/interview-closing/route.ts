import { type NextRequest, NextResponse } from "next/server";
import { generateInterviewClosing, type InterviewQAPair } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  let body: {
    attendeeName?: string;
    sessionTitle?: string;
    qa_pairs?: InterviewQAPair[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const attendeeName = (body.attendeeName ?? "there").toString().trim().slice(0, 120) || "there";
  const sessionTitle = (body.sessionTitle ?? "this session").toString().trim().slice(0, 220) || "this session";

  const qaPairs = Array.isArray(body.qa_pairs)
    ? body.qa_pairs
        .filter(
          (p) =>
            p &&
            typeof p.question === "string" &&
            typeof p.answer === "string" &&
            p.question.trim().length > 0
        )
        .map((p) => ({
          question: p.question.trim().slice(0, 300),
          answer: p.answer.trim().slice(0, 1200),
        }))
    : [];

  if (!qaPairs.length) {
    return NextResponse.json({ closingText: null });
  }

  const closingText = await generateInterviewClosing({
    attendeeName,
    sessionTitle,
    qaPairs,
  });

  return NextResponse.json({ closingText: closingText ?? null });
}
