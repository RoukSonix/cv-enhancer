import { NextRequest, NextResponse } from "next/server";
import { getAdminStats } from "@/lib/stats-cache";
import { isAdminAuthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
