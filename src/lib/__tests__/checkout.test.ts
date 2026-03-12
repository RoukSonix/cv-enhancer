import { describe, it, expect } from "vitest";

/** Validation logic matching the checkout route */
function validateCheckoutRequest(body: {
  roastId?: string;
  priceType?: string;
}): { error: string; status: number } | null {
  if (!body.roastId || typeof body.roastId !== "string") {
    return { error: "roastId is required", status: 400 };
  }
  if (body.priceType !== "single" && body.priceType !== "bundle") {
    return { error: 'priceType must be "single" or "bundle"', status: 400 };
  }
  return null;
}

describe("Checkout request validation", () => {
  it("rejects missing roastId", () => {
    const err = validateCheckoutRequest({ priceType: "single" });
    expect(err).toEqual({ error: "roastId is required", status: 400 });
  });

  it("rejects empty string roastId", () => {
    const err = validateCheckoutRequest({ roastId: "", priceType: "single" });
    expect(err).toEqual({ error: "roastId is required", status: 400 });
  });

  it("rejects invalid priceType", () => {
    const err = validateCheckoutRequest({ roastId: "abc123", priceType: "free" });
    expect(err).toEqual({
      error: 'priceType must be "single" or "bundle"',
      status: 400,
    });
  });

  it("rejects missing priceType", () => {
    const err = validateCheckoutRequest({ roastId: "abc123" });
    expect(err).toEqual({
      error: 'priceType must be "single" or "bundle"',
      status: 400,
    });
  });

  it("accepts valid single request", () => {
    const err = validateCheckoutRequest({ roastId: "abc123", priceType: "single" });
    expect(err).toBeNull();
  });

  it("accepts valid bundle request", () => {
    const err = validateCheckoutRequest({ roastId: "abc123", priceType: "bundle" });
    expect(err).toBeNull();
  });
});

describe("Price type selection", () => {
  const PRICE_SINGLE = "price_single_999";
  const PRICE_BUNDLE = "price_bundle_2499";

  function selectPriceId(priceType: "single" | "bundle"): string {
    return priceType === "single" ? PRICE_SINGLE : PRICE_BUNDLE;
  }

  it('returns single price ID for "single"', () => {
    expect(selectPriceId("single")).toBe(PRICE_SINGLE);
  });

  it('returns bundle price ID for "bundle"', () => {
    expect(selectPriceId("bundle")).toBe(PRICE_BUNDLE);
  });
});
