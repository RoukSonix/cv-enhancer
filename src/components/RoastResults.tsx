"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedScore } from "@/components/AnimatedScore";
import {
  AlertTriangle,
  Lightbulb,
  ArrowDown,
  Scan,
  Check,
  X,
  Flame,
  Loader2,
} from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { ShareButtons } from "@/components/ShareButtons";
import { RatingWidget } from "@/components/RatingWidget";
import type { RoastResult } from "@/lib/types";
import { scoreLabel } from "@/lib/score";

export { scoreLabel };

function scoreBadgeStyle(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

interface RoastResultsProps {
  result: RoastResult;
  onReset: () => void;
}

export function RoastResults({ result, onReset }: RoastResultsProps) {
  const router = useRouter();
  const isFree = result.tier !== "paid";
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState<"single" | "bundle" | "redeem" | null>(null);

  useEffect(() => {
    fetch("/api/checkout/credits")
      .then((res) => res.json())
      .then((data) => setCredits(data.credits ?? 0))
      .catch(() => {});
  }, []);

  async function handleCheckout(priceType: "single" | "bundle") {
    setLoading(priceType);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roastId: result.id, priceType }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
        setLoading(null);
      }
    } catch {
      toast.error("Failed to start checkout");
      setLoading(null);
    }
  }

  async function handleRedeem() {
    setLoading("redeem");
    try {
      const res = await fetch("/api/checkout/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roastId: result.id }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/roast/${result.id}`);
      } else {
        toast.error(data.error || "Failed to redeem credit");
        setLoading(null);
      }
    } catch {
      toast.error("Failed to redeem credit");
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Overall Score */}
      <Card className="border-fire-orange/10 overflow-hidden">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <TierBadge tier="free" />
          <p className="text-sm text-muted-foreground uppercase tracking-widest">
            Your Resume Score
          </p>
          <div className="flex justify-center">
            <AnimatedScore score={result.overallScore} />
          </div>
          <Badge
            variant="outline"
            className={`text-sm px-3 py-1 ${scoreBadgeStyle(result.overallScore)}`}
          >
            {scoreLabel(result.overallScore)}
          </Badge>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-lg mx-auto">
            {result.summary}
          </p>
          {result.email && (
            <p className="text-xs text-muted-foreground">
              Results sent to <span className="font-medium text-foreground">{result.email}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rating Widget */}
      <RatingWidget roastId={result.id} />

      {/* Top Issues */}
      <Card className="border-fire-orange/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-fire-orange" />
            Top Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {result.topIssues.map((issue, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm animate-slide-up-fade"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="shrink-0 w-7 h-7 rounded-full gradient-fire flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1">{issue}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ATS Score */}
      <Card className="border-fire-orange/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scan className="w-5 h-5 text-fire-orange" />
            ATS Compatibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ATS Score</span>
            <span className="font-bold text-gradient-fire">{result.atsScore}/100</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-fire animate-progress-fill"
              style={{ width: `${result.atsScore}%` }}
            />
          </div>
          {result.atsIssues.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {result.atsIssues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Section Breakdowns */}
      {result.sections.map((section, i) => (
        <Card
          key={i}
          className="border-fire-orange/10 border-l-4 border-l-fire-orange/40"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{section.name}</CardTitle>
              <Badge
                variant="outline"
                className={`${scoreBadgeStyle(section.score)}`}
              >
                {section.score}/100
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{section.roast}</p>
            {section.tips.length > 0 && (
              <div className="bg-fire-amber/5 border border-fire-amber/10 rounded-lg p-3 space-y-2">
                {section.tips.map((tip, j) => (
                  <div key={j} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-fire-amber shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Rewritten Bullets (paid only) */}
      {result.rewrittenBullets.length > 0 && (
        <Card className="border-fire-orange/10">
          <CardHeader>
            <CardTitle className="text-lg">Rewritten Bullet Points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {result.rewrittenBullets.map((bullet, i) => (
              <div key={i} className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-start gap-2 text-sm">
                  <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span className="line-through text-muted-foreground">
                    {bullet.original}
                  </span>
                </div>
                <div className="flex justify-center">
                  <ArrowDown className="w-4 h-4 text-fire-orange" />
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{bullet.rewritten}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  {bullet.why}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upsell (free tier) */}
      {isFree && (
        <div className="relative rounded-xl p-[1px] overflow-hidden">
          {/* Gradient border effect */}
          <div className="absolute inset-0 gradient-fire opacity-50" />
          <Card className="relative border-0 bg-card">
            <CardContent className="pt-6 text-center space-y-4">
              <Flame className="w-8 h-8 mx-auto text-fire-orange animate-flicker" />
              <p className="font-bold text-xl text-gradient-fire">
                Want the Full Roast?
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Get detailed breakdown of all 5 sections, 3 rewritten bullet points,
                full ATS analysis, and specific tips for every section.
              </p>
              {credits > 0 ? (
                <Button
                  size="lg"
                  className="w-full gradient-fire text-white font-semibold h-12 hover:opacity-90 transition-opacity border-0 animate-pulse-glow"
                  onClick={handleRedeem}
                  disabled={loading !== null}
                >
                  {loading === "redeem" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Use Credit ({credits} remaining)
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full gradient-fire text-white font-semibold h-12 hover:opacity-90 transition-opacity border-0 animate-pulse-glow"
                    onClick={() => handleCheckout("single")}
                    disabled={loading !== null}
                  >
                    {loading === "single" ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Get Full Roast -- $9.99
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:border-fire-orange hover:text-fire-orange transition-colors"
                    onClick={() => handleCheckout("bundle")}
                    disabled={loading !== null}
                  >
                    {loading === "bundle" ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    3 roasts for $24.99
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cross-sell */}
      <Card className="border-fire-orange/10 bg-muted/30">
        <CardContent className="pt-6 text-center space-y-3">
          <p className="font-semibold">Need a better resume?</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              className="hover:border-fire-orange hover:text-fire-orange transition-colors"
              onClick={() => toast("Coming soon!", { description: "Resume Template Pack will be available in a future update." })}
            >
              Resume Template Pack -- $29
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hover:border-fire-orange hover:text-fire-orange transition-colors"
              onClick={() => toast("Coming soon!", { description: "Professional Rewrite will be available in a future update." })}
            >
              Professional Rewrite -- $99
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={onReset}
          className="hover:text-fire-orange transition-colors"
        >
          Roast Another Resume
        </Button>
      </div>

      {/* Share buttons */}
      {result.id && (
        <div className="pt-2">
          <p className="text-center text-sm text-muted-foreground mb-3">Share your results</p>
          <ShareButtons
            score={result.overallScore}
            label={scoreLabel(result.overallScore)}
            url={typeof window !== "undefined" ? `${window.location.origin}/roast/${result.id}` : ""}
          />
        </div>
      )}
    </div>
  );
}
