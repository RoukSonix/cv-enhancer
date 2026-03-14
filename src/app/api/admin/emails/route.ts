import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === token;
  }

  const queryToken = req.nextUrl.searchParams.get("token");
  return queryToken === token;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format") || "json";

  const emails = await prisma.roast.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      email: true,
      marketingOptIn: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (format === "csv") {
    const csv = [
      "email,marketing_opt_in,created_at,roast_id",
      ...emails.map(
        (r) =>
          `${r.email},${r.marketingOptIn},${r.createdAt.toISOString()},${r.id}`
      ),
    ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=emails.csv",
      },
    });
  }

  return NextResponse.json({ emails, total: emails.length });
}
