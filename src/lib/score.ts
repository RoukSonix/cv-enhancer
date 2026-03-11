/**
 * Score label mapping — shared between server and client components.
 */
export function scoreLabel(score: number): string {
  if (score >= 90) return "Chef's Kiss";
  if (score >= 80) return "Pretty Good";
  if (score >= 70) return "Needs Work";
  if (score >= 60) return "Mediocre";
  if (score >= 40) return "Rough";
  if (score >= 20) return "Disaster";
  return "Dumpster Fire";
}
