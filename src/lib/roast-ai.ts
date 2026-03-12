import { openrouter, MODEL } from "@/lib/openrouter";
import { buildRoastPrompt } from "@/lib/prompt";
import type { RoastResult } from "@/lib/types";

/**
 * Run the AI roast for a given resume text and tier.
 * Returns a parsed RoastResult (without id/createdAt — caller sets those).
 */
export async function runRoastAI(
  resumeText: string,
  tier: "free" | "paid"
): Promise<Omit<RoastResult, "id" | "createdAt">> {
  const prompt = buildRoastPrompt(resumeText, tier);

  const completion = await openrouter.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 3000,
  });

  const raw = completion.choices[0]?.message?.content || "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI returned an invalid response — no JSON found");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    overallScore: parsed.overallScore ?? 0,
    summary: parsed.summary ?? "",
    sections: parsed.sections ?? [],
    atsScore: parsed.atsScore ?? 0,
    atsIssues: parsed.atsIssues ?? [],
    rewrittenBullets: parsed.rewrittenBullets ?? [],
    topIssues: parsed.topIssues ?? [],
    tier,
  };
}
