import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdf, PdfExtractionError } from "@/lib/pdf-fallback";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractTextFromPdf(buffer);
    const charCount = extraction.text.trim().length;

    const response: {
      text: string;
      charCount: number;
      method: "pdf-parse" | "pdfjs";
      warning?: string;
    } = {
      text: extraction.text.slice(0, 500),
      charCount,
      method: extraction.method,
    };

    if (charCount < 50) {
      response.warning =
        "Very little text extracted. Consider pasting your resume text instead.";
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PdfExtractionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Preview API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
