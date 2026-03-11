"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function AnimatedScore({
  score,
  size = 160,
  strokeWidth = 10,
}: AnimatedScoreProps) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayed / 100) * circumference;
  const offset = circumference - progress;

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * score));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  const gradientId = "fire-score-gradient";

  return (
    <div
      className="relative inline-flex items-center justify-center animate-score-reveal"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--fire-yellow)" />
            <stop offset="50%" stopColor="var(--fire-orange)" />
            <stop offset="100%" stopColor="var(--fire-red)" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
      {/* Score label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-gradient-fire tabular-nums">
          {displayed}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
          / 100
        </span>
      </div>
    </div>
  );
}
