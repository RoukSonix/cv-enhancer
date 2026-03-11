import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import type { RoastResult, RoastSection, RewrittenBullet } from "./types";

/**
 * Minified share payload — short keys to reduce URL length.
 * v: schema version (always 1 for now)
 */
interface SharePayload {
  v: number;
  s: number;
  sm: string;
  ti: string[];
  as: number;
  ai: string[];
  sc: { n: string; s: number; r: string; t: string[] }[];
  rb: { o: string; w: string; y: string }[];
}

function minify(result: RoastResult): SharePayload {
  return {
    v: 1,
    s: result.overallScore,
    sm: result.summary,
    ti: result.topIssues,
    as: result.atsScore,
    ai: result.atsIssues,
    sc: result.sections.map((sec: RoastSection) => ({
      n: sec.name,
      s: sec.score,
      r: sec.roast,
      t: sec.tips,
    })),
    rb: result.rewrittenBullets.map((b: RewrittenBullet) => ({
      o: b.original,
      w: b.rewritten,
      y: b.why,
    })),
  };
}

function expand(p: SharePayload): RoastResult {
  return {
    id: crypto.randomUUID(),
    overallScore: Math.max(0, Math.min(100, p.s)),
    summary: p.sm,
    topIssues: p.ti ?? [],
    atsScore: Math.max(0, Math.min(100, p.as)),
    atsIssues: p.ai ?? [],
    sections: (p.sc ?? []).map((sec) => ({
      name: sec.n,
      score: sec.s,
      roast: sec.r,
      tips: sec.t ?? [],
    })),
    rewrittenBullets: (p.rb ?? []).map((b) => ({
      original: b.o,
      rewritten: b.w,
      why: b.y,
    })),
    createdAt: new Date().toISOString(),
  };
}

export function encodeRoastResult(result: RoastResult): string {
  const payload = minify(result);
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeRoastResult(encoded: string): RoastResult | null {
  try {
    if (!encoded) return null;

    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const parsed = JSON.parse(json) as SharePayload;

    // Validate required fields
    if (typeof parsed.s !== "number") return null;
    if (typeof parsed.sm !== "string") return null;
    if (!Array.isArray(parsed.ti)) return null;
    if (typeof parsed.as !== "number") return null;

    return expand(parsed);
  } catch {
    return null;
  }
}

const URL_LENGTH_WARNING = 8000;

export function buildShareUrl(result: RoastResult, origin?: string): string {
  const encoded = encodeRoastResult(result);
  const base = origin ?? window.location.origin;
  const url = `${base}/roast?r=${encoded}`;

  if (url.length > URL_LENGTH_WARNING) {
    console.warn(
      `Share URL is ${url.length} chars (>${URL_LENGTH_WARNING}). May not work on all platforms.`
    );
  }

  return url;
}
