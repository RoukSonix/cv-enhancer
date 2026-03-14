import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const TEMPLATE_DIR = join(process.cwd(), "data", "templates");
const TEMPLATE_FILES = [
  "modern-minimal.docx",
  "corporate.docx",
  "creative-bold.docx",
  "tech-developer.docx",
  "ats-optimized.docx",
];

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  // Verify purchase exists
  const purchase = await prisma.templatePurchase.findUnique({
    where: { stripeSessionId: sessionId },
  });

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 403 });
  }

  // Update download count
  await prisma.templatePurchase.update({
    where: { id: purchase.id },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadAt: new Date(),
    },
  });

  // Build ZIP
  const zip = new JSZip();
  for (const filename of TEMPLATE_FILES) {
    const filepath = join(TEMPLATE_DIR, filename);
    const buffer = readFileSync(filepath);
    zip.file(filename, buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="resume-templates.zip"',
    },
  });
}
