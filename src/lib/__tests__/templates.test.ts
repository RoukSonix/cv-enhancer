import { describe, it, expect } from "vitest";

/** Unit tests for template purchase logic (Sprint 11) */

interface TemplatePurchaseRecord {
  id: string;
  email: string;
  stripeSessionId: string;
  downloadCount: number;
  lastDownloadAt: Date | null;
  userId: string | null;
}

interface WebhookSession {
  id: string;
  customer_email: string | null;
  customer_details: { email: string | null } | null;
  metadata: Record<string, string> | null;
}

// --- Logic under test ---

function isTemplatePurchase(metadata: Record<string, string> | null): boolean {
  return metadata?.purchaseType === "templates";
}

function isAlreadyProcessed(
  existing: TemplatePurchaseRecord | null
): boolean {
  return existing !== null;
}

function extractEmail(session: WebhookSession): string {
  return session.customer_email ?? session.customer_details?.email ?? "";
}

function extractUserId(metadata: Record<string, string> | null): string | null {
  return metadata?.userId || null;
}

function incrementDownload(
  purchase: TemplatePurchaseRecord
): TemplatePurchaseRecord {
  return {
    ...purchase,
    downloadCount: purchase.downloadCount + 1,
    lastDownloadAt: new Date(),
  };
}

function canDownload(purchase: TemplatePurchaseRecord | null): boolean {
  return purchase !== null;
}

// --- Tests ---

describe("Template purchase detection", () => {
  it("detects template purchase from metadata", () => {
    expect(isTemplatePurchase({ purchaseType: "templates" })).toBe(true);
  });

  it("rejects non-template metadata", () => {
    expect(
      isTemplatePurchase({ roastId: "abc", priceType: "single" })
    ).toBe(false);
  });

  it("rejects null metadata", () => {
    expect(isTemplatePurchase(null)).toBe(false);
  });

  it("rejects empty metadata", () => {
    expect(isTemplatePurchase({})).toBe(false);
  });
});

describe("Template webhook processing", () => {
  it("skips already-processed sessions", () => {
    const existing: TemplatePurchaseRecord = {
      id: "tp-1",
      email: "test@example.com",
      stripeSessionId: "cs_test_123",
      downloadCount: 0,
      lastDownloadAt: null,
      userId: null,
    };

    expect(isAlreadyProcessed(existing)).toBe(true);
  });

  it("processes new sessions", () => {
    expect(isAlreadyProcessed(null)).toBe(false);
  });

  it("extracts email from customer_email", () => {
    const session: WebhookSession = {
      id: "cs_test_1",
      customer_email: "user@example.com",
      customer_details: null,
      metadata: { purchaseType: "templates" },
    };
    expect(extractEmail(session)).toBe("user@example.com");
  });

  it("falls back to customer_details.email", () => {
    const session: WebhookSession = {
      id: "cs_test_2",
      customer_email: null,
      customer_details: { email: "details@example.com" },
      metadata: { purchaseType: "templates" },
    };
    expect(extractEmail(session)).toBe("details@example.com");
  });

  it("returns empty string when no email available", () => {
    const session: WebhookSession = {
      id: "cs_test_3",
      customer_email: null,
      customer_details: null,
      metadata: { purchaseType: "templates" },
    };
    expect(extractEmail(session)).toBe("");
  });

  it("extracts userId from metadata", () => {
    expect(extractUserId({ purchaseType: "templates", userId: "user-1" })).toBe(
      "user-1"
    );
  });

  it("returns null for empty userId", () => {
    expect(extractUserId({ purchaseType: "templates", userId: "" })).toBe(null);
  });

  it("returns null when no userId in metadata", () => {
    expect(extractUserId({ purchaseType: "templates" })).toBe(null);
  });
});

describe("Template download authorization", () => {
  it("allows download with valid purchase", () => {
    const purchase: TemplatePurchaseRecord = {
      id: "tp-1",
      email: "test@example.com",
      stripeSessionId: "cs_test_123",
      downloadCount: 0,
      lastDownloadAt: null,
      userId: null,
    };
    expect(canDownload(purchase)).toBe(true);
  });

  it("denies download without purchase", () => {
    expect(canDownload(null)).toBe(false);
  });
});

describe("Template download count tracking", () => {
  it("increments download count", () => {
    const purchase: TemplatePurchaseRecord = {
      id: "tp-1",
      email: "test@example.com",
      stripeSessionId: "cs_test_123",
      downloadCount: 0,
      lastDownloadAt: null,
      userId: null,
    };

    const updated = incrementDownload(purchase);
    expect(updated.downloadCount).toBe(1);
    expect(updated.lastDownloadAt).toBeInstanceOf(Date);
  });

  it("tracks multiple downloads", () => {
    const purchase: TemplatePurchaseRecord = {
      id: "tp-1",
      email: "test@example.com",
      stripeSessionId: "cs_test_123",
      downloadCount: 5,
      lastDownloadAt: new Date("2026-01-01"),
      userId: null,
    };

    const updated = incrementDownload(purchase);
    expect(updated.downloadCount).toBe(6);
  });
});
