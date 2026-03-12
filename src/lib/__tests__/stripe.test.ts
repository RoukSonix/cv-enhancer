import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Stripe client module", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws if STRIPE_SECRET_KEY is missing", async () => {
    process.env.STRIPE_PRICE_SINGLE = "price_single";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    delete process.env.STRIPE_SECRET_KEY;

    await expect(import("@/lib/stripe")).rejects.toThrow(
      "Missing required environment variable: STRIPE_SECRET_KEY"
    );
  });

  it("throws if STRIPE_PRICE_SINGLE is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    delete process.env.STRIPE_PRICE_SINGLE;

    await expect(import("@/lib/stripe")).rejects.toThrow(
      "Missing required environment variable: STRIPE_PRICE_SINGLE"
    );
  });

  it("throws if STRIPE_PRICE_BUNDLE is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_SINGLE = "price_single";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    delete process.env.STRIPE_PRICE_BUNDLE;

    await expect(import("@/lib/stripe")).rejects.toThrow(
      "Missing required environment variable: STRIPE_PRICE_BUNDLE"
    );
  });

  it("throws if STRIPE_WEBHOOK_SECRET is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_SINGLE = "price_single";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle";
    delete process.env.STRIPE_WEBHOOK_SECRET;

    await expect(import("@/lib/stripe")).rejects.toThrow(
      "Missing required environment variable: STRIPE_WEBHOOK_SECRET"
    );
  });

  it("exports correct price IDs when env vars are set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_SINGLE = "price_single_999";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle_2499";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const mod = await import("@/lib/stripe");
    expect(mod.STRIPE_PRICE_SINGLE).toBe("price_single_999");
    expect(mod.STRIPE_PRICE_BUNDLE).toBe("price_bundle_2499");
  });

  it("exports a stripe instance when all env vars are set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_SINGLE = "price_single";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const mod = await import("@/lib/stripe");
    expect(mod.stripe).toBeDefined();
  });
});
