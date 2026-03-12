import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRoastAI } from "@/lib/roast-ai";
import type { Prisma } from "@/generated/prisma/client";
import type { RoastResult } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const roast = await prisma.roast.findUnique({
      where: { id },
      select: { paid: true, tier: true, resumeText: true },
    });

    if (!roast) {
      return NextResponse.json({ error: "Roast not found" }, { status: 404 });
    }

    if (!roast.paid) {
      return NextResponse.json({ error: "Roast is not paid" }, { status: 400 });
    }

    if (roast.tier === "paid") {
      return NextResponse.json({ error: "Already upgraded" }, { status: 409 });
    }

    // Retry AI re-run for paid roasts stuck on free tier
    const aiResult = await runRoastAI(roast.resumeText, "paid");

    const newResult: RoastResult = {
      ...aiResult,
      id,
      createdAt: new Date().toISOString(),
      paid: true,
    };

    await prisma.roast.update({
      where: { id },
      data: {
        tier: "paid",
        result: newResult as unknown as Prisma.JsonObject,
        overallScore: newResult.overallScore,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upgrade API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
