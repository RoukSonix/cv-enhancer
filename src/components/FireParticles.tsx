"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  left: string;
  size: number;
  delay: string;
  duration: string;
  opacity: number;
}

export function FireParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${8 + Math.random() * 84}%`,
        size: 4 + Math.random() * 6,
        delay: `${Math.random() * 3}s`,
        duration: `${2 + Math.random() * 2}s`,
        opacity: 0.4 + Math.random() * 0.4,
      }))
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-float-up"
          style={{
            left: p.left,
            bottom: "10%",
            width: p.size,
            height: p.size,
            background: `linear-gradient(to top, var(--fire-orange), var(--fire-yellow))`,
            opacity: p.opacity,
            animationDelay: p.delay,
            animationDuration: p.duration,
            animationIterationCount: "infinite",
          }}
        />
      ))}
    </div>
  );
}
