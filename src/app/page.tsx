"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flame, Target, Scan, Pencil, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumeUpload } from "@/components/ResumeUpload";
import { RoastResults } from "@/components/RoastResults";
import { FireParticles } from "@/components/FireParticles";
import { buildShareUrlById } from "@/lib/share";
import type { RoastResult } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<RoastResult | null>(null);

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

      {/* Sticky header when results are shown */}
      {result && (
        <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
            <button
              onClick={() => setResult(null)}
              className="text-sm font-medium text-muted-foreground hover:text-fire-orange transition-colors"
            >
              Roast Another
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    const shareUrl = buildShareUrlById(result.id);
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Link copied!");
                  } catch {
                    toast.error("Failed to copy link");
                  }
                }}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Results
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12 max-w-4xl relative">
        {/* Hero section */}
        {!result && (
          <div className="relative text-center mb-12 space-y-6 pt-8">
            <FireParticles />

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fire-orange/20 bg-fire-orange/5 text-sm text-fire-orange animate-slide-up-fade">
              <Flame className="w-4 h-4" />
              AI-Powered Resume Critique
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight animate-slide-up-fade" style={{ animationDelay: "100ms" }}>
              Your Resume is
              <br />
              <span className="text-gradient-fire">Getting Roasted</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground max-w-xl mx-auto animate-slide-up-fade" style={{ animationDelay: "200ms" }}>
              Upload your resume and get a brutally honest AI critique.
              Discover what recruiters <em>really</em> think.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 animate-slide-up-fade" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground">
                <Target className="w-4 h-4 text-fire-orange" />
                Score 0-100
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground">
                <Scan className="w-4 h-4 text-fire-orange" />
                ATS Check
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground">
                <Pencil className="w-4 h-4 text-fire-orange" />
                Rewritten Bullets
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {result ? (
          <RoastResults result={result} onReset={() => setResult(null)} />
        ) : (
          <ResumeUpload onResult={setResult} />
        )}

        {/* Social proof */}
        {!result && (
          <div className="text-center mt-16 space-y-2 animate-slide-up-fade" style={{ animationDelay: "500ms" }}>
            <p className="text-sm text-muted-foreground">
              Trusted by job seekers who can handle the truth
            </p>
            <div className="flex justify-center gap-6 text-xs text-muted-foreground/60">
              <span>Free instant feedback</span>
              <span>No signup required</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-20 pb-8 text-xs text-muted-foreground/50">
          <p>Resume Roaster -- AI-powered resume critique</p>
        </footer>
      </div>
    </main>
  );
}
