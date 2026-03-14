import { PDFParse } from "pdf-parse";

const MIN_TEXT_LENGTH = 50;

export class PdfExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: "encrypted" | "image-only" | "corrupted" | "unknown"
  ) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

export type ExtractionResult = {
  text: string;
  method: "pdf-parse" | "pdfjs";
};

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const textParts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => "str" in item && typeof (item as { str?: string }).str === "string")
      .map((item) => (item as { str: string }).str)
      .join(" ");
    textParts.push(pageText);
  }

  doc.destroy();
  return textParts.join("\n");
}

function classifyError(err: unknown): PdfExtractionError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("password") || lower.includes("encrypted")) {
    return new PdfExtractionError(
      "This PDF is password-protected. Please remove the password and re-upload, or paste your resume text instead.",
      "encrypted"
    );
  }

  if (lower.includes("invalid") || lower.includes("corrupt") || lower.includes("not a pdf")) {
    return new PdfExtractionError(
      "This file doesn't appear to be a valid PDF. Please check the file and try again.",
      "corrupted"
    );
  }

  return new PdfExtractionError(
    "Could not extract text from this PDF. It may be encrypted, image-only, or corrupted.",
    "unknown"
  );
}

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  // Attempt 1: pdf-parse
  try {
    const text = await extractWithPdfParse(buffer);
    if (text.trim().length >= MIN_TEXT_LENGTH) {
      return { text, method: "pdf-parse" };
    }
    // Text too short — fall through to pdfjs
    console.warn(`pdf-parse returned only ${text.trim().length} chars, trying pdfjs fallback`);
  } catch (err) {
    console.warn("pdf-parse failed, trying pdfjs fallback:", err instanceof Error ? err.message : err);
  }

  // Attempt 2: pdfjs-dist
  try {
    const text = await extractWithPdfJs(buffer);
    if (text.trim().length >= MIN_TEXT_LENGTH) {
      return { text, method: "pdfjs" };
    }

    // Both parsers returned too little text
    if (text.trim().length === 0) {
      throw new PdfExtractionError(
        "This PDF contains only images — no text could be extracted. Please paste your resume text instead.",
        "image-only"
      );
    }

    // Some text but < 50 chars — still return it and let the caller decide
    return { text, method: "pdfjs" };
  } catch (err) {
    if (err instanceof PdfExtractionError) throw err;
    console.warn("pdfjs fallback also failed:", err instanceof Error ? err.message : err);
    throw classifyError(err);
  }
}

// Re-export for testing
export { extractWithPdfParse, extractWithPdfJs };
