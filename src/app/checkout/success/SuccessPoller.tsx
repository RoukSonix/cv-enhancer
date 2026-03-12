"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessPollerProps {
  roastId: string;
}

export function SuccessPoller({ roastId }: SuccessPollerProps) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const slowTimer = setTimeout(() => setSlow(true), 30000);

    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`/api/roast/${roastId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.tier === "paid") {
              router.replace(`/roast/${roastId}`);
              return;
            }
          }
        } catch {
          // ignore — keep polling
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // Also try the upgrade endpoint after 10s in case webhook AI failed
    const retryTimer = setTimeout(async () => {
      if (!cancelled) {
        try {
          await fetch(`/api/roast/${roastId}/upgrade`, { method: "POST" });
        } catch {
          // ignore
        }
      }
    }, 10000);

    poll();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      clearTimeout(retryTimer);
    };
  }, [roastId, router]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <Flame className="w-12 h-12 mx-auto text-fire-orange animate-flicker" />
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p>Processing your Full Roast...</p>
        </div>
        {slow && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Taking longer than expected...
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/roast/${roastId}`)}
              className="hover:border-fire-orange hover:text-fire-orange transition-colors"
            >
              View Results
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
