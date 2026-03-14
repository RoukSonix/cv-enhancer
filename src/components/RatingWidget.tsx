"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface RatingWidgetProps {
  roastId: string;
}

export function RatingWidget({ roastId }: RatingWidgetProps) {
  const [rated, setRated] = useState<1 | -1 | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRate(value: 1 | -1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/roast/${roastId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        setRated(value);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (rated !== null) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-muted-foreground">Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="text-center py-3 space-y-2">
      <p className="text-sm text-muted-foreground">Was this roast helpful?</p>
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
          onClick={() => handleRate(1)}
          disabled={loading}
        >
          <ThumbsUp className="w-4 h-4" />
          Yes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hover:border-red-500 hover:text-red-500 transition-colors"
          onClick={() => handleRate(-1)}
          disabled={loading}
        >
          <ThumbsDown className="w-4 h-4" />
          No
        </Button>
      </div>
    </div>
  );
}
