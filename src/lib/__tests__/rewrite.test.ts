import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** Unit tests for rewrite service logic (Sprint 12) */

// --- Rewrite order types ---

interface RewriteOrderRecord {
  id: string;
  email: string;
  tier: string;
  resumeText: string;
  notes: string | null;
  stripeSessionId: string | null;
  status: string;
  paidAt: Date | null;
  deliveredAt: Date | null;
}

interface WebhookSession {
  id: string;
  metadata: Record<string, string> | null;
}

// --- Logic under test ---

function isRewritePurchase(metadata: Record<string, string> | null): boolean {
  return metadata?.purchaseType === "rewrite";
}

function isValidTier(tier: string | null): tier is "basic" | "premium" {
  return tier === "basic" || tier === "premium";
}

function isValidRewriteStatus(status: string): boolean {
  return ["pending", "paid", "in_progress", "delivered"].includes(status);
}

function shouldUpdateOrder(order: RewriteOrderRecord | null): boolean {
  return order !== null && order.status === "pending";
}

function isIdempotent(order: RewriteOrderRecord | null): boolean {
  return order !== null && order.status !== "pending";
}

function getRewritePriceEnvVar(tier: "basic" | "premium"): string {
  return tier === "basic" ? "STRIPE_PRICE_REWRITE_BASIC" : "STRIPE_PRICE_REWRITE_PREMIUM";
}

function buildOrderUpdateData(
  sessionId: string,
  currentStatus: string
): { status: string; paidAt: Date; stripeSessionId: string } | null {
  if (currentStatus !== "pending") return null;
  return {
    status: "paid",
    paidAt: new Date(),
    stripeSessionId: sessionId,
  };
}

function buildStatusUpdateData(
  newStatus: string
): { status: string; deliveredAt?: Date } | null {
  if (!isValidRewriteStatus(newStatus)) return null;
  const data: { status: string; deliveredAt?: Date } = { status: newStatus };
  if (newStatus === "delivered") {
    data.deliveredAt = new Date();
  }
  return data;
}

function shouldSendNotification(adminEmail: string | undefined, apiKey: string | undefined): boolean {
  return !!adminEmail && !!apiKey;
}

// --- Tests ---

describe("Rewrite purchase detection", () => {
  it("detects rewrite purchase from metadata", () => {
    expect(isRewritePurchase({ purchaseType: "rewrite", orderId: "abc", tier: "basic" })).toBe(true);
  });

  it("rejects non-rewrite metadata", () => {
    expect(isRewritePurchase({ purchaseType: "templates" })).toBe(false);
  });

  it("rejects null metadata", () => {
    expect(isRewritePurchase(null)).toBe(false);
  });

  it("rejects empty metadata", () => {
    expect(isRewritePurchase({})).toBe(false);
  });
});

describe("Rewrite checkout validation", () => {
  it("accepts basic tier", () => {
    expect(isValidTier("basic")).toBe(true);
  });

  it("accepts premium tier", () => {
    expect(isValidTier("premium")).toBe(true);
  });

  it("rejects invalid tier", () => {
    expect(isValidTier("enterprise")).toBe(false);
  });

  it("rejects null tier", () => {
    expect(isValidTier(null)).toBe(false);
  });

  it("maps basic tier to correct env var", () => {
    expect(getRewritePriceEnvVar("basic")).toBe("STRIPE_PRICE_REWRITE_BASIC");
  });

  it("maps premium tier to correct env var", () => {
    expect(getRewritePriceEnvVar("premium")).toBe("STRIPE_PRICE_REWRITE_PREMIUM");
  });
});

describe("Rewrite webhook processing", () => {
  it("updates pending order to paid", () => {
    const order: RewriteOrderRecord = {
      id: "ord-1",
      email: "test@example.com",
      tier: "basic",
      resumeText: "My resume...",
      notes: null,
      stripeSessionId: null,
      status: "pending",
      paidAt: null,
      deliveredAt: null,
    };

    expect(shouldUpdateOrder(order)).toBe(true);
  });

  it("skips already-paid order (idempotency)", () => {
    const order: RewriteOrderRecord = {
      id: "ord-1",
      email: "test@example.com",
      tier: "basic",
      resumeText: "My resume...",
      notes: null,
      stripeSessionId: "cs_test_123",
      status: "paid",
      paidAt: new Date(),
      deliveredAt: null,
    };

    expect(shouldUpdateOrder(order)).toBe(false);
    expect(isIdempotent(order)).toBe(true);
  });

  it("skips order that is in_progress", () => {
    const order: RewriteOrderRecord = {
      id: "ord-1",
      email: "test@example.com",
      tier: "premium",
      resumeText: "My resume...",
      notes: "targeting PM roles",
      stripeSessionId: "cs_test_456",
      status: "in_progress",
      paidAt: new Date(),
      deliveredAt: null,
    };

    expect(shouldUpdateOrder(order)).toBe(false);
  });

  it("builds correct update data for pending order", () => {
    const data = buildOrderUpdateData("cs_test_789", "pending");
    expect(data).not.toBeNull();
    expect(data!.status).toBe("paid");
    expect(data!.stripeSessionId).toBe("cs_test_789");
    expect(data!.paidAt).toBeInstanceOf(Date);
  });

  it("returns null for non-pending order", () => {
    expect(buildOrderUpdateData("cs_test_789", "paid")).toBeNull();
    expect(buildOrderUpdateData("cs_test_789", "delivered")).toBeNull();
  });
});

describe("Admin status update validation", () => {
  it("accepts all valid statuses", () => {
    expect(isValidRewriteStatus("pending")).toBe(true);
    expect(isValidRewriteStatus("paid")).toBe(true);
    expect(isValidRewriteStatus("in_progress")).toBe(true);
    expect(isValidRewriteStatus("delivered")).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(isValidRewriteStatus("cancelled")).toBe(false);
    expect(isValidRewriteStatus("refunded")).toBe(false);
    expect(isValidRewriteStatus("")).toBe(false);
  });

  it("sets deliveredAt when status is delivered", () => {
    const data = buildStatusUpdateData("delivered");
    expect(data).not.toBeNull();
    expect(data!.status).toBe("delivered");
    expect(data!.deliveredAt).toBeInstanceOf(Date);
  });

  it("does not set deliveredAt for other statuses", () => {
    const data = buildStatusUpdateData("paid");
    expect(data).not.toBeNull();
    expect(data!.deliveredAt).toBeUndefined();
  });

  it("returns null for invalid status", () => {
    expect(buildStatusUpdateData("cancelled")).toBeNull();
  });
});

describe("Admin email notification", () => {
  it("should send when both ADMIN_EMAIL and RESEND_API_KEY are set", () => {
    expect(shouldSendNotification("admin@example.com", "re_test_123")).toBe(true);
  });

  it("should not send when ADMIN_EMAIL is missing", () => {
    expect(shouldSendNotification(undefined, "re_test_123")).toBe(false);
  });

  it("should not send when RESEND_API_KEY is missing", () => {
    expect(shouldSendNotification("admin@example.com", undefined)).toBe(false);
  });

  it("should not send when both are missing", () => {
    expect(shouldSendNotification(undefined, undefined)).toBe(false);
  });
});

describe("Lazy-loaded rewrite price IDs", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("existing stripe module imports still work without rewrite env vars", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_SINGLE = "price_single";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle";
    process.env.STRIPE_PRICE_TEMPLATES = "price_templates";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    // Deliberately NOT setting STRIPE_PRICE_REWRITE_BASIC or PREMIUM

    const mod = await import("@/lib/stripe");
    expect(mod.STRIPE_PRICE_SINGLE).toBe("price_single");
    expect(mod.stripe).toBeDefined();
    expect(mod.getRewritePriceId).toBeTypeOf("function");
  });

  it("getRewritePriceId throws when env var is missing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_SINGLE = "price_single";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle";
    process.env.STRIPE_PRICE_TEMPLATES = "price_templates";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const mod = await import("@/lib/stripe");
    expect(() => mod.getRewritePriceId("basic")).toThrow(
      "Missing required environment variable: STRIPE_PRICE_REWRITE_BASIC"
    );
  });

  it("getRewritePriceId returns correct value when set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_SINGLE = "price_single";
    process.env.STRIPE_PRICE_BUNDLE = "price_bundle";
    process.env.STRIPE_PRICE_TEMPLATES = "price_templates";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_PRICE_REWRITE_BASIC = "price_rewrite_basic_99";
    process.env.STRIPE_PRICE_REWRITE_PREMIUM = "price_rewrite_premium_199";

    const mod = await import("@/lib/stripe");
    expect(mod.getRewritePriceId("basic")).toBe("price_rewrite_basic_99");
    expect(mod.getRewritePriceId("premium")).toBe("price_rewrite_premium_199");
  });
});
