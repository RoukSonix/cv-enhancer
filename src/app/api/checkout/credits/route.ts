import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const bundleToken = req.cookies.get("bundle_token")?.value;

  if (!bundleToken) {
    return NextResponse.json({ credits: 0 });
  }

  const credits = await prisma.credit.count({
    where: { bundleToken, roastId: null },
  });

  return NextResponse.json({ credits });
}
