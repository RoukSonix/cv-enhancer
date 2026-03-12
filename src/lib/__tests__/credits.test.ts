import { describe, it, expect } from "vitest";

/** Simulates credit storage for testing redemption logic */
interface Credit {
  id: string;
  bundleToken: string;
  roastId: string | null;
  usedAt: Date | null;
}

function findUnusedCredit(credits: Credit[], bundleToken: string): Credit | undefined {
  return credits.find((c) => c.bundleToken === bundleToken && c.roastId === null);
}

function countUnusedCredits(credits: Credit[], bundleToken: string): number {
  return credits.filter((c) => c.bundleToken === bundleToken && c.roastId === null).length;
}

function redeemCredit(
  credits: Credit[],
  bundleToken: string,
  roastId: string
): { success: boolean; creditsRemaining: number; error?: string } {
  const credit = findUnusedCredit(credits, bundleToken);
  if (!credit) {
    return { success: false, creditsRemaining: 0, error: "No credits available" };
  }
  credit.roastId = roastId;
  credit.usedAt = new Date();
  const remaining = countUnusedCredits(credits, bundleToken);
  return { success: true, creditsRemaining: remaining };
}

describe("Credit redemption logic", () => {
  function makeCredits(bundleToken: string, count: number): Credit[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `credit-${i}`,
      bundleToken,
      roastId: null,
      usedAt: null,
    }));
  }

  it("finds unused credit by bundleToken", () => {
    const credits = makeCredits("token-abc", 3);
    const found = findUnusedCredit(credits, "token-abc");
    expect(found).toBeDefined();
    expect(found?.bundleToken).toBe("token-abc");
    expect(found?.roastId).toBeNull();
  });

  it("returns undefined when no unused credits", () => {
    const credits = makeCredits("token-abc", 2);
    credits[0].roastId = "roast-1";
    credits[1].roastId = "roast-2";
    expect(findUnusedCredit(credits, "token-abc")).toBeUndefined();
  });

  it("returns undefined for wrong bundleToken", () => {
    const credits = makeCredits("token-abc", 3);
    expect(findUnusedCredit(credits, "token-wrong")).toBeUndefined();
  });

  it("counts unused credits correctly", () => {
    const credits = makeCredits("token-abc", 3);
    credits[0].roastId = "roast-1";
    expect(countUnusedCredits(credits, "token-abc")).toBe(2);
  });

  it("counts zero for all used credits", () => {
    const credits = makeCredits("token-abc", 3);
    credits.forEach((c, i) => { c.roastId = `roast-${i}`; });
    expect(countUnusedCredits(credits, "token-abc")).toBe(0);
  });

  it("redeems a credit and decrements remaining", () => {
    const credits = makeCredits("token-abc", 3);
    // First credit already used (simulating bundle's initial use)
    credits[0].roastId = "roast-initial";
    credits[0].usedAt = new Date();

    const result = redeemCredit(credits, "token-abc", "roast-new");
    expect(result.success).toBe(true);
    expect(result.creditsRemaining).toBe(1);
  });

  it("fails to redeem when no credits left", () => {
    const credits = makeCredits("token-abc", 3);
    credits.forEach((c, i) => { c.roastId = `roast-${i}`; });

    const result = redeemCredit(credits, "token-abc", "roast-new");
    expect(result.success).toBe(false);
    expect(result.error).toBe("No credits available");
  });

  it("prevents double redemption on same credit", () => {
    const credits = makeCredits("token-abc", 1);
    const first = redeemCredit(credits, "token-abc", "roast-1");
    expect(first.success).toBe(true);
    expect(first.creditsRemaining).toBe(0);

    const second = redeemCredit(credits, "token-abc", "roast-2");
    expect(second.success).toBe(false);
    expect(second.error).toBe("No credits available");
  });

  it("bundle creates 3 credits with first one used", () => {
    const credits = makeCredits("token-bundle", 3);
    // Simulate webhook: first credit used immediately
    credits[0].roastId = "roast-initial";
    credits[0].usedAt = new Date();

    expect(countUnusedCredits(credits, "token-bundle")).toBe(2);

    // Redeem second
    const r1 = redeemCredit(credits, "token-bundle", "roast-2");
    expect(r1.success).toBe(true);
    expect(r1.creditsRemaining).toBe(1);

    // Redeem third
    const r2 = redeemCredit(credits, "token-bundle", "roast-3");
    expect(r2.success).toBe(true);
    expect(r2.creditsRemaining).toBe(0);

    // No more credits
    const r3 = redeemCredit(credits, "token-bundle", "roast-4");
    expect(r3.success).toBe(false);
  });
});
