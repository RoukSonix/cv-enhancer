"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

const MESSAGES = [
  "Firing up the grill...",
  "Judging your font choices...",
  "Counting buzzwords...",
  "Checking for typos...",
  "Evaluating your career...",
  "Consulting the roast gods...",
  "Measuring recruiter cringe...",
  "Scanning for red flags...",
];

export function LoadingRoast() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(msgTimer);
  }, []);

  useEffect(() => {
    const progTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 92));
    }, 400);
    return () => clearInterval(progTimer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Animated flame */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full gradient-fire blur-2xl opacity-30 animate-pulse-glow" />
        <Flame
          className="relative w-16 h-16 text-fire-orange animate-flicker"
          strokeWidth={1.5}
        />
      </div>

      {/* Rotating message */}
      <p className="text-lg font-medium text-foreground/80 h-7 transition-opacity duration-300">
        {MESSAGES[msgIndex]}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full gradient-fire transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {Math.round(progress)}% roasted
        </p>
      </div>
    </div>
  );
}
