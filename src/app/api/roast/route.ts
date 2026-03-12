import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { PDFParse } from "pdf-parse";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { runRoastAI } from "@/lib/roast-ai";
import { isValidEmail } from "@/lib/email";
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
    const email = (formData.get("email") as string | null)?.trim() || null;
    const marketingOptIn = formData.get("marketingOptIn") === "true";

    // Server-side email validation
    if (tier === "free" && (!email || !isValidEmail(email))) {
      return NextResponse.json(
        { error: "A valid email address is required for the free roast." },
        { status: 400 }
      );
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address format." },
        { status: 400 }
      );
    }

    let resumeText = "";

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 5MB." },
          { status: 413 }
        );
      }
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

    const aiResult = await runRoastAI(resumeText, tier);

    const result: RoastResult = {
      ...aiResult,
      id: nanoid(12),
      createdAt: new Date().toISOString(),
      email: email ?? undefined,
      marketingOptIn,
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
          email,
          marketingOptIn,
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
