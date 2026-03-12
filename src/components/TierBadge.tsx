import { Crown, Flame } from "lucide-react";

interface TierBadgeProps {
  tier: "free" | "paid";
}

export function TierBadge({ tier }: TierBadgeProps) {
  if (tier === "paid") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full gradient-fire text-white text-xs font-semibold tracking-wide uppercase shadow-lg">
        <Crown className="w-3.5 h-3.5" />
        Full Roast
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-muted-foreground/20 bg-muted text-muted-foreground text-xs font-medium tracking-wide uppercase">
      <Flame className="w-3.5 h-3.5" />
      Free Roast
    </div>
  );
}
