import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TierBadge } from "@/components/TierBadge";

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const roasts = await prisma.roast.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      overallScore: true,
      tier: true,
      createdAt: true,
      result: true,
    },
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">My Roasts</h1>

        {roasts.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Flame className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">No roasts yet.</p>
            <Link
              href="/"
              className="inline-block text-sm font-medium text-orange-400 hover:text-orange-300 underline underline-offset-4"
            >
              Roast your first resume!
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {roasts.map((roast) => {
              const resultObj = roast.result as Record<string, unknown>;
              const summary =
                typeof resultObj?.summary === "string"
                  ? resultObj.summary.slice(0, 80) +
                    (resultObj.summary.length > 80 ? "..." : "")
                  : "";

              return (
                <Link
                  key={roast.id}
                  href={`/roast/${roast.id}`}
                  className="block rounded-lg border border-border/40 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-2xl font-bold tabular-nums ${scoreColor(roast.overallScore)}`}
                      >
                        {roast.overallScore}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground truncate">
                          {summary || "Resume roast"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {new Date(roast.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <TierBadge tier={roast.tier as "free" | "paid"} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
