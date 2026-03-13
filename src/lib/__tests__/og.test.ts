import { describe, it, expect } from "vitest";
import {
  scoreColor,
  scoreColorSecondary,
  truncateSummary,
  scoreLabel,
  buildTwitterShareUrl,
  buildLinkedInShareUrl,
} from "../og-utils";

describe("scoreColor", () => {
  it("returns emerald for score >= 80", () => {
    expect(scoreColor(80)).toBe("#10b981");
    expect(scoreColor(85)).toBe("#10b981");
    expect(scoreColor(100)).toBe("#10b981");
  });

  it("returns amber for score >= 60 and < 80", () => {
    expect(scoreColor(60)).toBe("#f59e0b");
    expect(scoreColor(65)).toBe("#f59e0b");
    expect(scoreColor(79)).toBe("#f59e0b");
  });

  it("returns fire-orange for score < 60", () => {
    expect(scoreColor(59)).toBe("#f97316");
    expect(scoreColor(30)).toBe("#f97316");
    expect(scoreColor(0)).toBe("#f97316");
  });
});

describe("scoreColorSecondary", () => {
  it("returns fire-red for score < 60", () => {
    expect(scoreColorSecondary(30)).toBe("#ef4444");
    expect(scoreColorSecondary(0)).toBe("#ef4444");
  });

  it("returns amber for score >= 60 and < 80", () => {
    expect(scoreColorSecondary(65)).toBe("#f59e0b");
  });

  it("returns emerald for score >= 80", () => {
    expect(scoreColorSecondary(85)).toBe("#10b981");
  });
});

describe("scoreLabel (re-exported)", () => {
  it("returns correct label for each bracket", () => {
    expect(scoreLabel(95)).toBe("Chef's Kiss");
    expect(scoreLabel(85)).toBe("Pretty Good");
    expect(scoreLabel(75)).toBe("Needs Work");
    expect(scoreLabel(65)).toBe("Mediocre");
    expect(scoreLabel(50)).toBe("Rough");
    expect(scoreLabel(25)).toBe("Disaster");
    expect(scoreLabel(10)).toBe("Dumpster Fire");
  });
});

describe("truncateSummary", () => {
  it("returns text unchanged if <= maxLength", () => {
    expect(truncateSummary("Short text")).toBe("Short text");
    expect(truncateSummary("x".repeat(100))).toBe("x".repeat(100));
  });

  it("truncates text > maxLength with ellipsis", () => {
    const long = "x".repeat(150);
    const result = truncateSummary(long);
    expect(result).toBe("x".repeat(100) + "...");
    expect(result.length).toBe(103);
  });

  it("respects custom maxLength", () => {
    const result = truncateSummary("Hello, world! This is a test.", 10);
    expect(result).toBe("Hello, wor...");
  });

  it("trims trailing whitespace before ellipsis", () => {
    // 100 chars where char 100 is a space
    const text = "a".repeat(95) + "     " + "b".repeat(50);
    const result = truncateSummary(text);
    expect(result.endsWith("...")).toBe(true);
    expect(result).not.toMatch(/\s\.\.\./);
  });
});

describe("buildTwitterShareUrl", () => {
  it("builds correct Twitter intent URL", () => {
    const url = buildTwitterShareUrl(72, "https://resumeroaster.com/roast/abc123");
    expect(url).toContain("https://twitter.com/intent/tweet?");
    expect(url).toContain("text=");
    expect(url).toContain("url=");
    // Decode and check text content
    const parsed = new URL(url);
    expect(parsed.searchParams.get("text")).toBe("I just got roasted! Score: 72/100 🔥");
    expect(parsed.searchParams.get("url")).toBe("https://resumeroaster.com/roast/abc123");
  });

  it("encodes special characters properly", () => {
    const url = buildTwitterShareUrl(100, "https://example.com/roast?r=abc&x=1");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("url")).toBe("https://example.com/roast?r=abc&x=1");
  });
});

describe("buildLinkedInShareUrl", () => {
  it("builds correct LinkedIn share URL", () => {
    const url = buildLinkedInShareUrl("https://resumeroaster.com/roast/abc123");
    expect(url).toContain("https://www.linkedin.com/sharing/share-offsite/?");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("url")).toBe("https://resumeroaster.com/roast/abc123");
  });
});

describe("share text content", () => {
  it("matches spec format: I just got roasted! Score: X/100 🔥", () => {
    const url = buildTwitterShareUrl(42, "https://example.com");
    const parsed = new URL(url);
    const text = parsed.searchParams.get("text");
    expect(text).toBe("I just got roasted! Score: 42/100 🔥");
  });
});
