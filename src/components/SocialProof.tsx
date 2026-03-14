"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalRoasts: number;
  avgRating: number;
}

export function SocialProof() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <div className="text-center mt-16 space-y-2 animate-slide-up-fade" style={{ animationDelay: "500ms" }}>
      {stats && stats.totalRoasts > 0 ? (
        <p className="text-sm text-muted-foreground">
          <span className="text-fire-orange font-semibold">{stats.totalRoasts.toLocaleString()}</span> resumes roasted
          {stats.avgRating > 0 && (
            <>
              {" "}&bull;{" "}
              <span className="text-fire-orange font-semibold">{Math.round(stats.avgRating * 100)}%</span> positive ratings
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Trusted by job seekers who can handle the truth
        </p>
      )}
      <div className="flex justify-center gap-6 text-xs text-muted-foreground/60">
        <span>Free instant feedback</span>
        <span>No signup required</span>
      </div>
    </div>
  );
}
