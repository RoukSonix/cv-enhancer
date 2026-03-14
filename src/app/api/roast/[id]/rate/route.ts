import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateStatsCache } from "@/lib/stats-cache";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { value } = body;

    if (value !== 1 && value !== -1) {
      return NextResponse.json(
        { error: "Value must be 1 or -1" },
        { status: 400 }
      );
    }

    const roast = await prisma.roast.findUnique({ where: { id } });
    if (!roast) {
      return NextResponse.json({ error: "Roast not found" }, { status: 404 });
    }

    await prisma.roast.update({
      where: { id },
      data: { rating: value },
    });

    invalidateStatsCache();

    return NextResponse.json({ success: true, value });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 }
    );
  }
}
