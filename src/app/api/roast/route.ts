import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { PDFParse } from "pdf-parse";
import { nanoid } from "nanoid";
import { openrouter, MODEL } from "@/lib/openrouter";
import { buildRoastPrompt } from "@/lib/prompt";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { RoastResult } from "@/lib/types";

export const maxDuration = 60;

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    const textInput = formData.get("resumeText") as string | null;
    const tier = (formData.get("tier") as "free" | "paid") || "free";

    let resumeText = "";

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      resumeText = await extractTextFromPdf(buffer);
    } else if (textInput) {
      resumeText = textInput;
    } else {
      return NextResponse.json(
        { error: "No resume provided. Upload a PDF or paste text." },
        { status: 400 }
      );
    }

    if (resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short. Please provide a complete resume." },
        { status: 400 }
      );
    }

    const prompt = buildRoastPrompt(resumeText, tier);

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content || "";

    // Extract JSON from the response (handle models that wrap in code fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse AI response:", raw);
      return NextResponse.json(
        { error: "AI returned an invalid response. Please try again." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result: RoastResult = {
      id: nanoid(12),
      overallScore: parsed.overallScore ?? 0,
      summary: parsed.summary ?? "",
      sections: parsed.sections ?? [],
      atsScore: parsed.atsScore ?? 0,
      atsIssues: parsed.atsIssues ?? [],
      rewrittenBullets: parsed.rewrittenBullets ?? [],
      topIssues: parsed.topIssues ?? [],
      createdAt: new Date().toISOString(),
    };

    // Persist to database (best-effort — don't fail the request if DB is down)
    try {
      const resumeHash = createHash("sha256").update(resumeText).digest("hex");
      await prisma.roast.create({
        data: {
          id: result.id,
          resumeText,
          resumeHash,
          tier,
          result: result as unknown as Prisma.JsonObject,
          overallScore: result.overallScore,
        },
      });
    } catch (dbError) {
      console.warn("Failed to save roast to database:", dbError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Roast API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
