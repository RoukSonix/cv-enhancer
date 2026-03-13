"use client";

import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoastResults } from "@/components/RoastResults";
import { RoastResultsFull } from "@/components/RoastResultsFull";
import { ShareButtons } from "@/components/ShareButtons";
import { scoreLabel } from "@/lib/score";
import type { RoastResult } from "@/lib/types";

interface SharedRoastViewProps {
  result: RoastResult;
}

export function SharedRoastView({ result }: SharedRoastViewProps) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.75 0.15 55 / 0.08), transparent 70%)",
        }}
      />

      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Flame className="w-4 h-4 text-fire-orange" />
            Resume Roaster
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hover:border-fire-orange hover:text-fire-orange transition-colors"
            onClick={() => router.push("/")}
          >
            Get your own roast
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl relative">
        {result.tier === "paid" || result.rewrittenBullets.length > 0 ? (
          <RoastResultsFull result={result} onReset={() => router.push("/")} />
        ) : (
          <RoastResults result={result} onReset={() => router.push("/")} />
        )}

        {/* Share buttons */}
        <div className="mt-8 mb-4">
          <p className="text-center text-sm text-muted-foreground mb-3">Share your results</p>
          <ShareButtons
            score={result.overallScore}
            label={scoreLabel(result.overallScore)}
            url={typeof window !== "undefined" ? window.location.href : ""}
          />
        </div>

        {/* Footer */}
        <footer className="text-center mt-20 pb-8 text-xs text-muted-foreground/50">
          <p>Resume Roaster -- AI-powered resume critique</p>
        </footer>
      </div>
    </main>
  );
}
