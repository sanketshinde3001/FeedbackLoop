import { type NextRequest, NextResponse } from "next/server";

const MODEL = "gemini-3.1-flash-lite-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are a feedback question generator. Generate exactly 5 short, simple questions that ask attendees for their honest feedback about the session.

Requirements:
- Output ONLY a valid JSON array with exactly 5 question strings
- Each question must be SHORT (max 10 words) and focused on USER FEEDBACK only
- Ask about what they liked, what could improve, overall impression, and recommendations
- NO questions about session topics or technical details
- Questions should be conversational and easy to answer
- NO markdown, NO explanation, NO wrapping text
- Format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]

Examples of good feedback questions:
- "What did you like most about this session?"
- "What could we improve?"
- "How likely are you to recommend this to others?"
- "Was the pace of the session good?"
- "What was your biggest takeaway?"`;

async function generateQuestions(description: string, apiKey: string): Promise<string[] | null> {
  const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Session: ${description.trim()}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error("[generate-questions] API error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) {
      console.error("[generate-questions] No response from Gemini");
      return null;
    }

    const questions = JSON.parse(raw) as string[];
    if (
      !Array.isArray(questions) ||
      questions.length !== 5 ||
      !questions.every((q) => typeof q === "string")
    ) {
      console.error("[generate-questions] Invalid response format:", questions);
      return null;
    }

    return questions;
  } catch (err) {
    console.error("[generate-questions] Error:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { description?: string };
  const description = body.description?.trim();

  if (!description || description.length < 10) {
    return NextResponse.json({ error: "Description must be at least 10 characters" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const questions = await generateQuestions(description, apiKey);
  if (!questions) {
    return NextResponse.json(
      { error: "Failed to generate questions. Please try again or write them manually." },
      { status: 500 }
    );
  }

  return NextResponse.json({ questions });
}
