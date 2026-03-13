import { scoreLabel } from "./score";

export { scoreLabel };

/**
 * Returns the accent color for a given score.
 * ≥80: emerald, ≥60: amber, <60: fire-orange
 */
export function scoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#f97316";
}

/**
 * Returns the secondary/gradient color for low scores.
 */
export function scoreColorSecondary(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

/**
 * Truncates text to a max length with ellipsis.
 */
export function truncateSummary(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Builds Twitter share intent URL.
 */
export function buildTwitterShareUrl(score: number, pageUrl: string): string {
  const text = `I just got roasted! Score: ${score}/100 🔥`;
  const params = new URLSearchParams({ text, url: pageUrl });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Builds LinkedIn share URL.
 */
export function buildLinkedInShareUrl(pageUrl: string): string {
  const params = new URLSearchParams({ url: pageUrl });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}
