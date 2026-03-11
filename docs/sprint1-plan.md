# Sprint 1: Share Results — Implementation Plan

**Created:** 2026-03-11
**Branch:** `sprint1/share-results`
**Goal:** Users can copy a share link to their roast results. Opening that link shows the same results without needing a database.

---

## Architecture Decision: Query Params, Not Hash Fragments

The URL format will be `/roast?r=<encoded>` using a **query parameter** (`?r=`), not a hash fragment (`#r=`). This is critical because:

- Hash fragments (`#`) are **not sent to the server** — `generateMetadata()` would have no access to the data
- OG meta tags (og:title, og:description) require server-side rendering in the initial HTML
- Query params are available in Next.js server components via `searchParams`

---

## Encoding Strategy

### Data Flow

```
RoastResult → minify (short keys) → JSON.stringify → lz-string compress → URL-safe string
```

### Why lz-string?

- `lz-string` is a lightweight (~5KB) library purpose-built for compressing strings into URL-safe encodings
- Its `compressToEncodedURIComponent()` method produces output that is safe for URLs without additional encoding
- Typical 50-70% compression ratio on JSON text
- No need for separate base64 step — the output is already URL-safe

### Minified Key Mapping

To reduce JSON size before compression, map verbose keys to short ones:

```typescript
// RoastResult → SharePayload (minified)
{
  v:  number;          // schema version (always 1 for now)
  s:  number;          // overallScore
  sm: string;          // summary
  ti: string[];        // topIssues
  as: number;          // atsScore
  ai: string[];        // atsIssues
  sc: {                // sections[]
    n: string;         //   name
    s: number;         //   score
    r: string;         //   roast
    t: string[];       //   tips
  }[];
  rb: {                // rewrittenBullets[]
    o: string;         //   original
    w: string;         //   rewritten
    y: string;         //   why
  }[];
}
```

Fields **excluded** from the encoded payload (regenerated on decode):
- `id` — generated fresh with `crypto.randomUUID()`
- `createdAt` — set to current timestamp on decode

### Estimated URL Length

| Tier | Raw JSON | Compressed | Full URL |
|------|----------|------------|----------|
| Free | ~500-800 bytes | ~300-500 chars | ~530-550 chars |
| Paid | ~2-4 KB | ~1-2 KB chars | ~1050-2050 chars |

Free tier is well within all browser/platform limits. Paid tier may approach limits on some platforms (Twitter truncates at ~4096), but paid tier sharing is not a Sprint 1 concern (no payments yet).

### URL Length Limit Handling

If the compressed output exceeds **8000 characters** (conservative browser limit):
- Log a warning to console
- Still copy the URL (it will work in most browsers)
- Future Sprint 2 will solve this with database-backed `/roast/[id]` URLs

---

## Files to Create

### 1. `src/lib/share.ts` — Encoding/Decoding Utilities

**Purpose:** Pure functions for encoding `RoastResult` → URL string and decoding URL string → `RoastResult`.

```
encodeRoastResult(result: RoastResult): string
  → minify keys → JSON.stringify → compressToEncodedURIComponent → return string

decodeRoastResult(encoded: string): RoastResult | null
  → decompressFromEncodedURIComponent → JSON.parse → expand keys → validate → return RoastResult or null

buildShareUrl(result: RoastResult, origin?: string): string
  → return `${origin ?? window.location.origin}/roast?r=${encodeRoastResult(result)}`
  (optional `origin` param allows unit testing without mocking `window`)
```

**Validation on decode:**
- Check `decompressFromEncodedURIComponent` returns non-null (catches corrupted data)
- Check `JSON.parse` succeeds (catches malformed JSON)
- Check `v` field: if missing, treat as v1 (backwards compat). If present and unrecognized, still attempt v1 decode (best-effort)
- Validate required fields exist: `s` (number), `sm` (string), `ti` (array), `as` (number)
- Validate `overallScore` is 0-100, `atsScore` is 0-100
- If any check fails, return `null`

### 2. `src/app/roast/page.tsx` — Shared Results Page

**Purpose:** Server component that decodes the `r` query param and renders results.

**IMPORTANT: In Next.js 15+/16, `searchParams` is a `Promise` and must be `await`ed.**

**Structure:**
```typescript
// searchParams is a Promise in Next.js 16 — must be awaited
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  // decode r, return OG tags
}

export default async function RoastPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  // decode r, render <SharedRoastView> or error state
}
```

**OG Meta Tags (from `generateMetadata`):**
```typescript
{
  title: `Resume Score: ${score}/100 — ${scoreLabel(score)} | Resume Roaster`,
  description: summary (truncated to 160 chars),
  openGraph: {
    title: `Resume Score: ${score}/100 — ${scoreLabel(score)}`,
    description: summary (truncated to 160 chars),
    type: 'article',
    siteName: 'Resume Roaster',
  },
  twitter: {
    card: 'summary',
    title: `Resume Score: ${score}/100 — ${scoreLabel(score)}`,
    description: summary (truncated to 160 chars),
  }
}
```

**Error handling:**
- Missing `r` param → show "No results to display" with link to home
- Invalid/corrupted `r` param → show "This share link is invalid or expired" with link to home
- Both error states include a CTA: "Roast your own resume →"

### 3. `src/components/SharedRoastView.tsx` — Client Wrapper for Shared Page

**Purpose:** Client component wrapper that receives the decoded `RoastResult` as a prop and renders it using the existing `<RoastResults>` component.

**Why a separate wrapper?**
- The `/roast/page.tsx` is a server component (needed for `generateMetadata`)
- `RoastResults` is a client component (uses `toast`, `onClick`)
- The wrapper handles the `onReset` behavior: navigates to `/` instead of clearing state
- The wrapper also customizes the sticky header: shows "Get your own roast" instead of "Roast Another"

**Structure:**
```
SharedRoastView({ result: RoastResult })
  → Renders a modified header ("Get your own roast" link to /)
  → Renders <RoastResults result={result} onReset={() => router.push('/')} />
```

---

## Files to Modify

### 4. `src/app/page.tsx` — Update Share Button

**Change:** Replace `navigator.clipboard.writeText(window.location.href)` with:
```typescript
import { buildShareUrl } from "@/lib/share";

// In the Share Results button onClick:
const shareUrl = buildShareUrl(result);
await navigator.clipboard.writeText(shareUrl);
toast.success("Link copied!");
```

This is the only change to this file — the share button on line 43-49.

### 5. `src/components/RoastResults.tsx` — Extract `scoreLabel` for Reuse

**Change:** Export the `scoreLabel()` function so it can be used by the `/roast` page's `generateMetadata()`.

```typescript
// Change from:
function scoreLabel(score: number): string {
// Change to:
export function scoreLabel(score: number): string {
```

This is a one-word change. The function is already pure and has no dependencies.

### 6. `package.json` — Add lz-string Dependency

**Change:** Add `lz-string` to dependencies.
```
"lz-string": "^1.5.0"
```

No separate `@types/lz-string` needed — lz-string v1.5+ ships its own TypeScript declarations.

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/share.ts` | **Create** | Encode/decode utilities |
| `src/app/roast/page.tsx` | **Create** | Shared results page + OG meta |
| `src/components/SharedRoastView.tsx` | **Create** | Client wrapper for shared page |
| `src/app/page.tsx` | **Modify** | Update Share button to use `buildShareUrl()` |
| `src/components/RoastResults.tsx` | **Modify** | Export `scoreLabel()` |
| `package.json` | **Modify** | Add `lz-string` dependency |
| `docs/STATUS.md` | **Modify** | Update status after implementation |

---

## Edge Cases & Error Handling

| Case | Handling |
|------|----------|
| Missing `r` query param | Show friendly error page with CTA to home |
| Corrupted/truncated `r` value | `decompressFromEncodedURIComponent` returns null → error page |
| Malformed JSON after decompression | `JSON.parse` in try/catch → error page |
| Missing required fields after parse | Validation check → error page |
| `overallScore` outside 0-100 | Clamp to 0-100 range |
| Empty `sections` array | Render results without section cards (graceful) |
| Empty `topIssues` array | Render results without top issues card (graceful) |
| URL exceeds browser length limits | URL still generated; works in most browsers. Console warning logged. |
| User manually edits URL param | Same as corrupted — validation catches it |
| Special characters in AI-generated text | `lz-string` handles all UTF-8; `JSON.stringify` escapes as needed |

---

## Test Plan

### Unit Tests (`src/lib/__tests__/share.test.ts`)

Tests for `encodeRoastResult` and `decodeRoastResult`:

1. **Round-trip: free tier result** — encode then decode, verify all fields match original
2. **Round-trip: paid tier result** — encode then decode with sections + rewritten bullets
3. **Decode returns null for empty string** — `decodeRoastResult("")` → `null`
4. **Decode returns null for random garbage** — `decodeRoastResult("abc123!@#")` → `null`
5. **Decode returns null for valid lz-string but invalid JSON** — compress a non-JSON string, try to decode
6. **Decode returns null for missing required fields** — compress JSON missing `s` (overallScore)
7. **Score clamping** — encode a result with `overallScore: 150`, decode should clamp to 100
8. **Excluded fields regenerated** — decoded result has a valid `id` (UUID format) and `createdAt` (ISO string)
9. **buildShareUrl produces valid URL** — pass explicit `origin`, verify URL starts with it, contains `/roast?r=`, param is non-empty
10. **Version field round-trip** — encoded payload includes `v: 1`, decode handles missing `v` gracefully (backwards compat)

Tests for key minification:
11. **Minified JSON is smaller than original** — verify the minified output has fewer characters

### Component Tests (`src/app/roast/__tests__/page.test.tsx`)

**Note:** The `/roast/page.tsx` is an async server component (uses `await searchParams`). Standard `@testing-library/react` cannot render async server components directly. Options:
- Test the decode-and-render logic via unit tests on `decodeRoastResult` + integration tests via Playwright
- Or use `next/experimental/testing/server` if available in Next.js 16

12. **Renders results when valid `r` param provided** — mock searchParams with valid encoded result, verify score renders
13. **Renders error state when `r` param missing** — verify "No results" message and home link
14. **Renders error state when `r` param invalid** — verify "invalid or expired" message

### Integration Tests (Manual / Playwright)

15. **Full share flow:** Submit resume → get results → click Share → paste URL in new tab → see same results
16. **OG meta tags:** `curl` the shared URL, verify `og:title` contains score, `og:description` contains summary
17. **Error page:** Visit `/roast` with no params → see error with home link
18. **Error page:** Visit `/roast?r=garbage` → see error with home link
19. **Mobile:** Share flow works on mobile viewport

### Test Setup

No test framework exists yet. Add **Vitest** (fast, native ESM, works with Next.js):

```
devDependencies:
  "vitest": "^3.x"
  "@vitejs/plugin-react": "^4.x"
  "@testing-library/react": "^16.x"
  "@testing-library/jest-dom": "^6.x"
  "jsdom": "^26.x"
```

Add `vitest.config.ts` at project root. Add `"test": "vitest"` script to `package.json`.

Unit tests for `share.ts` don't need React — they're pure function tests and can run with just Vitest.

---

## Implementation Order

1. `npm install lz-string` (+ dev deps for testing)
2. Create `src/lib/share.ts` with encode/decode/buildShareUrl
3. Write unit tests for share.ts — verify all pass
4. Export `scoreLabel` from `RoastResults.tsx`
5. Create `src/components/SharedRoastView.tsx`
6. Create `src/app/roast/page.tsx` with `generateMetadata` and error states
7. Update Share button in `src/app/page.tsx`
8. Manual testing: full share flow in browser
9. Update `docs/STATUS.md`
10. Commit and create PR

---

## Out of Scope (Future Sprints)

- **Database-backed URLs** — Sprint 2 will add `/roast/[id]` with persistent storage
- **Dynamic OG images** — Sprint 8 will add generated images with scores
- **Social share buttons** ("Share on Twitter/LinkedIn") — Sprint 8
- **Paid tier sharing** — No payments yet, but encoding supports it when ready
- **URL shortening** — Not needed until paid tier produces longer URLs

---

## Validation: APPROVED

**Validated:** 2026-03-11
**Validator:** Claude (Plan Validation Agent)

### Issues Found & Fixed

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| 1 | **Critical** | `searchParams` is a `Promise` in Next.js 15+/16 — plan didn't specify `await` | Added explicit async signatures with `await searchParams` for both `generateMetadata` and page component |
| 2 | **Important** | No version field in encoded payload — old share links would break silently on schema changes | Added `v: 1` to minified key mapping with backwards-compat decode logic |
| 3 | **Important** | `@types/lz-string` note was misleading — v1.5+ ships own types | Removed; clarified no separate types package needed |
| 4 | **Minor** | `buildShareUrl` used `window.location.origin` with no way to inject origin for unit tests | Added optional `origin` parameter |
| 5 | **Minor** | Component tests assumed async server components can be rendered with `@testing-library/react` | Added note about server component testing limitations |

### Items Confirmed as Sound

- **lz-string** is the right choice: ~5KB, purpose-built `compressToEncodedURIComponent`, good compression ratio
- **URL lengths** are safe for free tier (~530-550 chars); paid tier limits correctly deferred to Sprint 2
- **Server/client component split** is correct: server component for `generateMetadata`, client wrapper for interactivity
- **No SSR/hydration issues**: query params read server-side, `window` only used in client-side click handler
- **`scoreLabel` export** is safe: pure function, no side effects, no existing consumers affected
- **Edge case handling** is thorough: corrupted data, missing fields, score clamping, empty arrays all covered
