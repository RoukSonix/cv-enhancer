"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Flame, Clock, Mail, FileText } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [orderInfo, setOrderInfo] = useState<{
    status: string;
    tier: string;
  } | null>(null);
  const [pageStatus, setPageStatus] = useState<"loading" | "ready" | "error">("loading");

  const checkOrder = useCallback(async () => {
    if (!sessionId) {
      setPageStatus("error");
      return;
    }
    try {
      const res = await fetch(`/api/rewrite/status?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setOrderInfo(data);
        setPageStatus("ready");
      } else if (res.status === 404) {
        // Webhook hasn't fired yet — retry
        setTimeout(checkOrder, 2000);
      } else {
        setPageStatus("error");
      }
    } catch {
      setTimeout(checkOrder, 2000);
    }
  }, [sessionId]);

  useEffect(() => {
    checkOrder();
  }, [checkOrder]);

  const turnaround = orderInfo?.tier === "premium" ? "24 hours" : "3 business days";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <Card className="border-fire-orange/10 overflow-hidden">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {pageStatus === "loading" && (
              <>
                <Loader2 className="w-12 h-12 mx-auto text-fire-orange animate-spin" />
                <h1 className="text-2xl font-bold">Processing your payment...</h1>
                <p className="text-sm text-muted-foreground">
                  This usually takes just a few seconds.
                </p>
              </>
            )}

            {pageStatus === "ready" && (
              <>
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-400" />
                <h1 className="text-2xl font-bold">Your rewrite order has been placed!</h1>
                <p className="text-sm text-muted-foreground">
                  {orderInfo?.tier === "premium" ? "Premium" : "Basic"} Rewrite — Expected turnaround: {turnaround}
                </p>

                <div className="text-left space-y-3 bg-muted/50 rounded-lg p-4 mt-4">
                  <p className="font-semibold text-sm">What happens next?</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="w-4 h-4 text-fire-orange shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Our expert writer reviews your resume</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Clock className="w-4 h-4 text-fire-orange shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Your rewrite is crafted within {turnaround}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Mail className="w-4 h-4 text-fire-orange shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">We&apos;ll email you when your rewrite is ready</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {pageStatus === "error" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-2xl">!</span>
                </div>
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">
                  We couldn&apos;t verify your order. Please contact support if this persists.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cross-sell */}
        <Card className="border-fire-orange/10 bg-muted/30">
          <CardContent className="pt-6 text-center space-y-3">
            <Flame className="w-6 h-6 mx-auto text-fire-orange" />
            <p className="font-semibold">While you wait, get your resume roasted!</p>
            <p className="text-sm text-muted-foreground">
              See how your current resume scores with our AI-powered roast.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href="/">
                <Button
                  variant="outline"
                  className="hover:border-fire-orange hover:text-fire-orange transition-colors"
                >
                  Roast My Resume
                </Button>
              </Link>
              <Link href="/templates">
                <Button
                  variant="outline"
                  className="hover:border-fire-orange hover:text-fire-orange transition-colors"
                >
                  Resume Templates — $29
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RewriteSuccessPage() {
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
