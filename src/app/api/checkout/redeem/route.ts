import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRoastAI } from "@/lib/roast-ai";
import type { Prisma } from "@/generated/prisma/client";
import type { RoastResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const bundleToken = req.cookies.get("bundle_token")?.value;
    if (!bundleToken) {
      return NextResponse.json(
        { error: "No bundle token found" },
        { status: 402 }
      );
    }

    const body = await req.json();
    const { roastId } = body as { roastId?: string };

    if (!roastId || typeof roastId !== "string") {
      return NextResponse.json(
        { error: "roastId is required" },
        { status: 400 }
      );
    }

    const roast = await prisma.roast.findUnique({
      where: { id: roastId },
      select: { id: true, paid: true, resumeText: true },
    });

    if (!roast) {
      return NextResponse.json({ error: "Roast not found" }, { status: 404 });
    }

    if (roast.paid) {
      return NextResponse.json(
        { error: "Roast is already paid" },
        { status: 409 }
      );
    }

    // Find an unused credit
    const credit = await prisma.credit.findFirst({
      where: { bundleToken, roastId: null },
      orderBy: { createdAt: "asc" },
    });

    if (!credit) {
      return NextResponse.json(
        { error: "No credits available" },
        { status: 402 }
      );
    }

    // Use the credit and mark roast as paid
    await prisma.credit.update({
      where: { id: credit.id },
      data: { roastId, usedAt: new Date() },
    });

    await prisma.roast.update({
      where: { id: roastId },
      data: {
        paid: true,
        paidAt: new Date(),
        creditId: credit.id,
      },
    });

    // Re-run AI with paid prompt
    try {
      const aiResult = await runRoastAI(roast.resumeText, "paid");

      const newResult: RoastResult = {
        ...aiResult,
        id: roastId,
        createdAt: new Date().toISOString(),
        paid: true,
      };

      await prisma.roast.update({
        where: { id: roastId },
        data: {
          tier: "paid",
          result: newResult as unknown as Prisma.JsonObject,
          overallScore: newResult.overallScore,
        },
      });
    } catch (aiError) {
      console.error("Failed to re-run AI for credit redemption:", aiError);
      // Roast is still marked paid — user can retry via upgrade endpoint
    }

    // Count remaining credits
    const creditsRemaining = await prisma.credit.count({
      where: { bundleToken, roastId: null },
    });

    return NextResponse.json({ success: true, creditsRemaining });
  } catch (error) {
    console.error("Redeem API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
