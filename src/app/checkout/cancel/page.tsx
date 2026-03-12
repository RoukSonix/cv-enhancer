"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

function CancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roastId = searchParams.get("roast_id");

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <Flame className="w-12 h-12 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Payment Cancelled</h1>
        <p className="text-muted-foreground">
          No worries! Your free roast is still available.
        </p>
        <div className="flex flex-col gap-3">
          {roastId && (
            <Button
              variant="outline"
              onClick={() => router.push(`/roast/${roastId}`)}
              className="hover:border-fire-orange hover:text-fire-orange transition-colors"
            >
              View Free Results
            </Button>
          )}
          <Button
            className="gradient-fire text-white font-semibold border-0 hover:opacity-90 transition-opacity"
            onClick={() => router.push("/")}
          >
            Roast Another Resume
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense>
      <CancelContent />
    </Suspense>
  );
}
