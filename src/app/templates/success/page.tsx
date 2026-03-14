"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle, Flame } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [downloading, setDownloading] = useState(false);

  const checkPurchase = useCallback(async () => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    try {
      const res = await fetch(`/api/templates/download?session_id=${sessionId}`, {
        method: "HEAD",
      });
      if (res.ok) {
        setStatus("ready");
      } else if (res.status === 403) {
        // Webhook hasn't fired yet — retry
        setTimeout(checkPurchase, 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setTimeout(checkPurchase, 2000);
    }
  }, [sessionId]);

  useEffect(() => {
    checkPurchase();
  }, [checkPurchase]);

  function handleDownload() {
    if (!sessionId) return;
    setDownloading(true);
    // Trigger file download via browser navigation
    window.location.href = `/api/templates/download?session_id=${sessionId}`;
    setTimeout(() => setDownloading(false), 3000);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <Card className="border-fire-orange/10 overflow-hidden">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 mx-auto text-fire-orange animate-spin" />
                <h1 className="text-2xl font-bold">Processing your payment...</h1>
                <p className="text-sm text-muted-foreground">
                  This usually takes just a few seconds.
                </p>
              </>
            )}

            {status === "ready" && (
              <>
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-400" />
                <h1 className="text-2xl font-bold">Your templates are ready!</h1>
                <p className="text-sm text-muted-foreground">
                  Click below to download all 5 resume templates as a ZIP file.
                </p>
                <Button
                  size="lg"
                  className="w-full gradient-fire text-white font-semibold h-12 hover:opacity-90 transition-opacity border-0"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download All Templates
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can return to this page to download again anytime.
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-2xl">!</span>
                </div>
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">
                  We couldn&apos;t verify your purchase. Please contact support if this persists.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cross-sell */}
        <Card className="border-fire-orange/10 bg-muted/30">
          <CardContent className="pt-6 text-center space-y-3">
            <Flame className="w-6 h-6 mx-auto text-fire-orange" />
            <p className="font-semibold">Now get your resume roasted!</p>
            <p className="text-sm text-muted-foreground">
              Upload your resume for an AI-powered roast with detailed feedback.
            </p>
            <Link href="/">
              <Button
                variant="outline"
                className="hover:border-fire-orange hover:text-fire-orange transition-colors"
              >
                Roast My Resume
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TemplatesSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-fire-orange" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
