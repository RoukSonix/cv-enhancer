import { describe, it, expect } from "vitest";
import { compressToEncodedURIComponent } from "lz-string";
import {
  encodeRoastResult,
  decodeRoastResult,
  buildShareUrl,
} from "../share";
import type { RoastResult } from "../types";

const FREE_RESULT: RoastResult = {
  id: "test-id-123",
  overallScore: 42,
  summary: "Your resume reads like a grocery list written by someone who hates groceries.",
  topIssues: [
    "No quantifiable achievements",
    "Generic objective statement",
    "Inconsistent formatting",
  ],
  atsScore: 55,
  atsIssues: ["Missing keywords", "Non-standard section headers"],
  sections: [
    {
      name: "First Impression",
      score: 35,
      roast: "It looks like a Word doc from 2003.",
      tips: ["Use a modern template", "Add white space"],
    },
  ],
  rewrittenBullets: [],
  createdAt: "2026-03-11T00:00:00.000Z",
};

const PAID_RESULT: RoastResult = {
  ...FREE_RESULT,
  id: "test-id-456",
  overallScore: 78,
  sections: [
    {
      name: "First Impression",
      score: 70,
      roast: "Not terrible, but not great either.",
      tips: ["Tighten up the summary"],
    },
    {
      name: "Experience",
      score: 80,
      roast: "Solid experience section with room for improvement.",
      tips: ["Add more metrics", "Use stronger action verbs"],
    },
  ],
  rewrittenBullets: [
    {
      original: "Responsible for managing team",
      rewritten: "Led a cross-functional team of 8 engineers, delivering 3 projects on time",
      why: "Quantifies impact and uses strong action verb",
    },
  ],
};

describe("encodeRoastResult / decodeRoastResult", () => {
  it("round-trips a free tier result", () => {
    const encoded = encodeRoastResult(FREE_RESULT);
    const decoded = decodeRoastResult(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.overallScore).toBe(FREE_RESULT.overallScore);
    expect(decoded!.summary).toBe(FREE_RESULT.summary);
    expect(decoded!.topIssues).toEqual(FREE_RESULT.topIssues);
    expect(decoded!.atsScore).toBe(FREE_RESULT.atsScore);
    expect(decoded!.atsIssues).toEqual(FREE_RESULT.atsIssues);
    expect(decoded!.sections).toEqual(FREE_RESULT.sections);
    expect(decoded!.rewrittenBullets).toEqual([]);
  });

  it("round-trips a paid tier result with sections and rewritten bullets", () => {
    const encoded = encodeRoastResult(PAID_RESULT);
    const decoded = decodeRoastResult(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.overallScore).toBe(PAID_RESULT.overallScore);
    expect(decoded!.sections).toHaveLength(2);
    expect(decoded!.sections[1].name).toBe("Experience");
    expect(decoded!.rewrittenBullets).toHaveLength(1);
    expect(decoded!.rewrittenBullets[0].original).toBe("Responsible for managing team");
    expect(decoded!.rewrittenBullets[0].rewritten).toContain("Led a cross-functional team");
  });

  it("returns null for empty string", () => {
    expect(decodeRoastResult("")).toBeNull();
  });

  it("returns null for random garbage", () => {
    expect(decodeRoastResult("abc123!@#$%^&*()")).toBeNull();
  });

  it("returns null for valid lz-string but invalid JSON", () => {
    const compressed = compressToEncodedURIComponent("this is not json");
    expect(decodeRoastResult(compressed)).toBeNull();
  });

  it("returns null for missing required fields", () => {
    const payload = JSON.stringify({ v: 1, sm: "hello" }); // missing s, ti, as
    const compressed = compressToEncodedURIComponent(payload);
    expect(decodeRoastResult(compressed)).toBeNull();
  });

  it("clamps overallScore above 100 to 100", () => {
    const result = { ...FREE_RESULT, overallScore: 150 };
    const encoded = encodeRoastResult(result);
    const decoded = decodeRoastResult(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.overallScore).toBe(100);
  });

  it("clamps overallScore below 0 to 0", () => {
    const result = { ...FREE_RESULT, overallScore: -10 };
    const encoded = encodeRoastResult(result);
    const decoded = decodeRoastResult(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.overallScore).toBe(0);
  });

  it("regenerates id and createdAt on decode", () => {
    const encoded = encodeRoastResult(FREE_RESULT);
    const decoded = decodeRoastResult(encoded);

    expect(decoded).not.toBeNull();
    // id should be a new UUID, not the original
    expect(decoded!.id).not.toBe(FREE_RESULT.id);
    expect(decoded!.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    // createdAt should be a valid ISO string
    expect(decoded!.createdAt).not.toBe(FREE_RESULT.createdAt);
    expect(new Date(decoded!.createdAt).toISOString()).toBe(decoded!.createdAt);
  });
});

describe("buildShareUrl", () => {
  it("produces valid URL with explicit origin", () => {
    const url = buildShareUrl(FREE_RESULT, "https://example.com");

    expect(url).toMatch(/^https:\/\/example\.com\/roast\?r=.+/);
    // The r param should be non-empty
    const rParam = new URL(url).searchParams.get("r");
    expect(rParam).toBeTruthy();
  });

  it("produces a URL whose r param decodes back to the original result", () => {
    const url = buildShareUrl(FREE_RESULT, "https://example.com");
    const rParam = new URL(url).searchParams.get("r")!;
    const decoded = decodeRoastResult(rParam);

    expect(decoded).not.toBeNull();
    expect(decoded!.overallScore).toBe(FREE_RESULT.overallScore);
    expect(decoded!.summary).toBe(FREE_RESULT.summary);
  });
});

describe("schema version", () => {
  it("encoded payload includes v: 1", () => {
    const encoded = encodeRoastResult(FREE_RESULT);
    // Decompress to check raw payload
    const { decompressFromEncodedURIComponent } = require("lz-string");
    const json = decompressFromEncodedURIComponent(encoded);
    const parsed = JSON.parse(json);
    expect(parsed.v).toBe(1);
  });

  it("decodes payload without v field (backwards compat)", () => {
    // Simulate a v0 payload (no version field)
    const payload = JSON.stringify({
      s: 50,
      sm: "A decent resume",
      ti: ["Issue one"],
      as: 60,
      ai: [],
      sc: [],
      rb: [],
    });
    const compressed = compressToEncodedURIComponent(payload);
    const decoded = decodeRoastResult(compressed);

    expect(decoded).not.toBeNull();
    expect(decoded!.overallScore).toBe(50);
    expect(decoded!.summary).toBe("A decent resume");
  });
});

describe("key minification", () => {
  it("minified JSON is smaller than raw RoastResult JSON", () => {
    const rawSize = JSON.stringify(FREE_RESULT).length;
    const encoded = encodeRoastResult(FREE_RESULT);
    // The encoded (compressed) string should be shorter than the raw JSON
    expect(encoded.length).toBeLessThan(rawSize);
  });
});
