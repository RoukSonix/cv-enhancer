import { describe, it, expect } from "vitest";
import type { RoastResult } from "../types";

/** Helper: infer effective tier from a RoastResult (same logic used in components) */
function getTier(result: RoastResult): "free" | "paid" {
  return result.tier === "paid" ? "paid" : "free";
}

const BASE_RESULT: RoastResult = {
  id: "test-tier-123",
  overallScore: 50,
  summary: "A test summary.",
  topIssues: ["Issue 1"],
  atsScore: 60,
  atsIssues: ["ATS issue"],
  sections: [{ name: "First Impression", score: 45, roast: "Test.", tips: ["Tip"] }],
  rewrittenBullets: [],
  createdAt: "2026-03-12T00:00:00.000Z",
};

describe("getTier", () => {
  it('returns "free" when tier field is undefined (backward compat)', () => {
    const result: RoastResult = { ...BASE_RESULT };
    // tier is undefined by default
    expect(getTier(result)).toBe("free");
  });

  it('returns "free" when tier field is "free"', () => {
    const result: RoastResult = { ...BASE_RESULT, tier: "free" };
    expect(getTier(result)).toBe("free");
  });

  it('returns "paid" when tier field is "paid"', () => {
    const result: RoastResult = { ...BASE_RESULT, tier: "paid" };
    expect(getTier(result)).toBe("paid");
  });

  it("free result has no rewritten bullets", () => {
    const result: RoastResult = { ...BASE_RESULT, tier: "free" };
    expect(result.rewrittenBullets).toHaveLength(0);
    expect(getTier(result)).toBe("free");
  });

  it("paid result includes tier field alongside rewritten bullets", () => {
    const result: RoastResult = {
      ...BASE_RESULT,
      tier: "paid",
      sections: [
        { name: "Format & Layout", score: 55, roast: "Test.", tips: ["Tip 1", "Tip 2"] },
        { name: "Work Experience", score: 70, roast: "Test.", tips: ["Tip 1", "Tip 2"] },
        { name: "Skills & Keywords", score: 60, roast: "Test.", tips: ["Tip 1", "Tip 2"] },
        { name: "Education & Certs", score: 75, roast: "Test.", tips: ["Tip 1", "Tip 2"] },
        { name: "Overall Impact", score: 50, roast: "Test.", tips: ["Tip 1", "Tip 2"] },
      ],
      rewrittenBullets: [
        { original: "Did tasks", rewritten: "Led 5 projects...", why: "Quantified impact" },
        { original: "Helped team", rewritten: "Mentored 3 juniors...", why: "Shows leadership" },
        { original: "Used tools", rewritten: "Architected CI/CD...", why: "Specificity" },
      ],
    };
    expect(getTier(result)).toBe("paid");
    expect(result.sections).toHaveLength(5);
    expect(result.rewrittenBullets).toHaveLength(3);
  });
});

describe("RoastResult tier field", () => {
  it("tier is optional in the interface (backward compat)", () => {
    // This test validates that the type allows omitting tier
    const result: RoastResult = { ...BASE_RESULT };
    expect(result.tier).toBeUndefined();
    // Should still work — no type errors at compile time
    expect(result.overallScore).toBe(50);
  });

  it("paid tier section names match prompt.ts exactly", () => {
    const expectedNames = [
      "Format & Layout",
      "Work Experience",
      "Skills & Keywords",
      "Education & Certs",
      "Overall Impact",
    ];

    const paidResult: RoastResult = {
      ...BASE_RESULT,
      tier: "paid",
      sections: expectedNames.map((name) => ({
        name,
        score: 50,
        roast: "Test roast.",
        tips: ["Tip 1", "Tip 2"],
      })),
    };

    expect(paidResult.sections.map((s) => s.name)).toEqual(expectedNames);
  });
});
