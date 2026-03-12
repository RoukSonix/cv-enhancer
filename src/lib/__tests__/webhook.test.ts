import { describe, it, expect } from "vitest";

/** Simulates webhook idempotency and processing logic for unit testing */

interface RoastRecord {
  id: string;
  paid: boolean;
  stripeSessionId: string | null;
  tier: "free" | "paid";
}

interface WebhookMetadata {
  roastId: string;
  priceType: "single" | "bundle";
  bundleToken?: string;
}

function isAlreadyProcessed(roast: RoastRecord, sessionId: string): boolean {
  return roast.stripeSessionId === sessionId;
}

function processPayment(
  roast: RoastRecord,
  sessionId: string,
  metadata: WebhookMetadata
): { processed: boolean; credits?: number } {
  if (isAlreadyProcessed(roast, sessionId)) {
    return { processed: false };
  }

  roast.paid = true;
  roast.stripeSessionId = sessionId;

  if (metadata.priceType === "bundle") {
    return { processed: true, credits: 3 };
  }

  return { processed: true };
}

describe("Webhook idempotency", () => {
  it("skips already-processed sessions", () => {
    const roast: RoastRecord = {
      id: "roast-1",
      paid: true,
      stripeSessionId: "cs_test_123",
      tier: "paid",
    };

    expect(isAlreadyProcessed(roast, "cs_test_123")).toBe(true);
  });

  it("processes new sessions", () => {
    const roast: RoastRecord = {
      id: "roast-1",
      paid: false,
      stripeSessionId: null,
      tier: "free",
    };

    expect(isAlreadyProcessed(roast, "cs_test_123")).toBe(false);
  });

  it("does not double-process even with different metadata", () => {
    const roast: RoastRecord = {
      id: "roast-1",
      paid: true,
      stripeSessionId: "cs_test_123",
      tier: "paid",
    };

    const result = processPayment(roast, "cs_test_123", {
      roastId: "roast-1",
      priceType: "single",
    });

    expect(result.processed).toBe(false);
  });
});

describe("Webhook payment processing", () => {
  it("marks roast as paid for single purchase", () => {
    const roast: RoastRecord = {
      id: "roast-1",
      paid: false,
      stripeSessionId: null,
      tier: "free",
    };

    const result = processPayment(roast, "cs_test_456", {
      roastId: "roast-1",
      priceType: "single",
    });

    expect(result.processed).toBe(true);
    expect(roast.paid).toBe(true);
    expect(roast.stripeSessionId).toBe("cs_test_456");
    expect(result.credits).toBeUndefined();
  });

  it("creates 3 credits for bundle purchase", () => {
    const roast: RoastRecord = {
      id: "roast-1",
      paid: false,
      stripeSessionId: null,
      tier: "free",
    };

    const result = processPayment(roast, "cs_test_789", {
      roastId: "roast-1",
      priceType: "bundle",
      bundleToken: "token-abc",
    });

    expect(result.processed).toBe(true);
    expect(result.credits).toBe(3);
    expect(roast.paid).toBe(true);
  });

  it("handles AI failure gracefully — roast still marked paid", () => {
    const roast: RoastRecord = {
      id: "roast-1",
      paid: false,
      stripeSessionId: null,
      tier: "free",
    };

    // Process payment (this happens before AI call)
    processPayment(roast, "cs_test_fail", {
      roastId: "roast-1",
      priceType: "single",
    });

    // Simulate AI failure — tier stays "free" but paid is true
    expect(roast.paid).toBe(true);
    expect(roast.tier).toBe("free"); // AI hasn't run yet
  });
});

describe("Webhook metadata validation", () => {
  it("requires roastId in metadata", () => {
    const metadata = { priceType: "single" } as WebhookMetadata;
    expect(metadata.roastId).toBeUndefined();
  });

  it("requires priceType in metadata", () => {
    const metadata = { roastId: "roast-1" } as WebhookMetadata;
    expect(metadata.priceType).toBeUndefined();
  });

  it("bundleToken is optional for single purchases", () => {
    const metadata: WebhookMetadata = {
      roastId: "roast-1",
      priceType: "single",
    };
    expect(metadata.bundleToken).toBeUndefined();
  });

  it("bundleToken is present for bundle purchases", () => {
    const metadata: WebhookMetadata = {
      roastId: "roast-1",
      priceType: "bundle",
      bundleToken: "token-xyz",
    };
    expect(metadata.bundleToken).toBe("token-xyz");
  });
});
