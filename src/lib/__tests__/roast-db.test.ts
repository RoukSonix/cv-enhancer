import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { buildShareUrlById } from "../share";

describe("nanoid", () => {
  it("generates a 12-char URL-safe ID", () => {
    const id = nanoid(12);
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => nanoid(12)));
    expect(ids.size).toBe(100);
  });
});

describe("resumeHash", () => {
  it("is deterministic for the same input", () => {
    const text = "Software Engineer with 5 years of experience";
    const hash1 = createHash("sha256").update(text).digest("hex");
    const hash2 = createHash("sha256").update(text).digest("hex");
    expect(hash1).toBe(hash2);
  });

  it("produces different hash for different input", () => {
    const hash1 = createHash("sha256").update("Resume A").digest("hex");
    const hash2 = createHash("sha256").update("Resume B").digest("hex");
    expect(hash1).not.toBe(hash2);
  });

  it("produces a 64-char hex string", () => {
    const hash = createHash("sha256").update("test").digest("hex");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

describe("buildShareUrlById", () => {
  it("produces correct /roast/[id] URL with explicit origin", () => {
    const url = buildShareUrlById("abc123", "https://example.com");
    expect(url).toBe("https://example.com/roast/abc123");
  });

  it("works with nanoid-style IDs", () => {
    const id = "V1StGXR8_Z5j";
    const url = buildShareUrlById(id, "https://example.com");
    expect(url).toBe("https://example.com/roast/V1StGXR8_Z5j");
  });

  it("handles IDs with hyphens and underscores", () => {
    const url = buildShareUrlById("a-b_c-d_e-f", "https://example.com");
    expect(url).toBe("https://example.com/roast/a-b_c-d_e-f");
  });

  it("uses window.location.origin when no origin provided", () => {
    // jsdom provides window.location.origin
    const url = buildShareUrlById("test123");
    expect(url).toBe(`${window.location.origin}/roast/test123`);
  });
});
