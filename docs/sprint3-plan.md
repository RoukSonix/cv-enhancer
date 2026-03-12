# Sprint 3: Paid Tier UI (Full Roast) — Implementation Plan

**Created:** 2026-03-12
**Branch:** `sprint3/paid-tier-ui`
**Goal:** Display full roast results for paid users — all 5 sections, rewritten bullets, tier indicator.

---

## Current State Analysis

### What Free Tier Shows Today
| Element | Details |
|---------|---------|
| Overall Score | Animated ring 0-100, score badge |
| Summary | 2-3 sentence roast |
| Top Issues | 3 issues |
| ATS Score | Score bar + 1 ATS issue |
| Sections | 1 section: "First Impression" (score, roast, 1 tip) |
| Rewritten Bullets | None |
| Upsell CTA | "Want the Full Roast?" block with $9.99 button |
| Cross-sell | Template Pack $29, Professional Rewrite $99 |

### What Paid Tier Will Show
| Element | Details |
|---------|---------|
| Overall Score | Same animated ring + **"Full Roast" badge** |
| Summary | 3-5 sentence roast (more detailed) |
| Top Issues | **5 issues** (vs 3) |
| ATS Score | Score bar + **3 ATS issues** (vs 1) |
| Sections | **5 sections**: Format & Layout, Work Experience, Skills & Keywords, Education & Certs, Overall Impact (each with score, roast, 2 tips) |
| Rewritten Bullets | **3 rewritten bullets** with original → rewritten + explanation |
| Upsell CTA | **None** (already paid) |
| Cross-sell | Same (Template Pack, Professional Rewrite) |
| Tier Indicator | "Full Roast" badge in score header |

### Free vs Paid Comparison

| Feature | Free | Paid |
|---------|------|------|
| Summary length | 2-3 sentences | 3-5 sentences |
| Top Issues | 3 | 5 |
| ATS Issues | 1 | 3 |
| Sections | 1 (First Impression) | 5 (all) |
| Tips per section | 1 | 2 |
| Rewritten Bullets | 0 | 3 |
| Tier badge | "Free Roast" | "Full Roast" (premium styling) |
| Upsell CTA | Yes | No |

---

## Files to Create/Modify

### 1. Modify: `src/lib/types.ts`

**Change:** Add optional `tier` field to `RoastResult`.

```ts
export interface RoastResult {
  id: string;
  overallScore: number;
  summary: string;
  sections: RoastSection[];
  atsScore: number;
  atsIssues: string[];
  rewrittenBullets: RewrittenBullet[];
  topIssues: string[];
  createdAt: string;
  tier?: "free" | "paid";  // NEW — optional for backward compat
}
```

**Rationale:** The tier is currently inferred by checking `rewrittenBullets.length === 0`, which is fragile. An explicit field is clearer and lets us show the tier badge without guessing. Optional so existing share URLs and DB records still decode correctly.

---

### 2. Modify: `src/app/api/roast/route.ts`

**Change:** Include `tier` in the response object.

```ts
const result: RoastResult = {
  id: nanoid(12),
  // ... existing fields ...
  tier,  // NEW — pass through the tier from the request
};
```

No other API changes needed — it already accepts `tier` from formData and passes it to `buildRoastPrompt`.

---

### 3. Modify: `src/app/page.tsx`

**Changes:**
- Read `?tier=paid` query param from the URL for local testing
- Pass `tier` to `ResumeUpload` so it can send it to the API
- Conditionally render `RoastResultsFull` (paid) vs `RoastResults` (free) based on `result.tier`
- Show tier in the sticky header

**Props flow:**
```
page.tsx
  ├── reads ?tier=paid from URL (useSearchParams)
  ├── passes tier to <ResumeUpload tier={tier} onResult={setResult} />
  └── result.tier === "paid"
        ? <RoastResultsFull result={result} onReset={...} />
        : <RoastResults result={result} onReset={...} />
```

---

### 4. Modify: `src/components/ResumeUpload.tsx`

**Change:** Accept `tier` prop and send it in the formData.

```ts
interface ResumeUploadProps {
  onResult: (result: RoastResult) => void;
  tier?: "free" | "paid";  // NEW
}
```

In `handleSubmit`:
```ts
formData.set("tier", tier ?? "free");  // was hardcoded "free"
```

---

### 5. Create: `src/components/TierBadge.tsx`

**Purpose:** Reusable tier indicator badge for the results header.

**Props:**
```ts
interface TierBadgeProps {
  tier: "free" | "paid";
}
```

**Rendering:**
- Free: Badge with muted styling, text "Free Roast"
- Paid: Badge with gradient-fire styling, sparkle/crown icon, text "Full Roast"

---

### 6. Create: `src/components/RoastResultsFull.tsx`

**Purpose:** Premium results display for paid tier. Shows all 5 sections, rewritten bullets, and premium styling.

**Props:**
```ts
interface RoastResultsFullProps {
  result: RoastResult;
  onReset: () => void;
}
```

**Structure (top to bottom):**

1. **Score Header** — same AnimatedScore ring, but with `<TierBadge tier="paid" />` above the score
2. **Summary** — same as free but potentially longer text
3. **Top Issues** — renders all 5 issues (same card as free, just more items)
4. **ATS Compatibility** — score bar + all 3 ATS issues (same card structure)
5. **Section Cards (5x)** — each section gets its own card:
   - Format & Layout
   - Work Experience
   - Skills & Keywords
   - Education & Certs
   - Overall Impact
   - Each card: section name, score badge, roast text, tips with lightbulb icons
   - **Premium styling:** left border accent with per-section color coding (fire gradient for low scores, amber for medium, emerald for high)
6. **Rewritten Bullets** — the original → rewritten cards (already exists in `RoastResults.tsx`, extract and reuse the same UI pattern)
7. **Cross-sell** — same Template Pack + Professional Rewrite block
8. **Reset button** — "Roast Another Resume"

**Premium styling differences from free tier:**
- `<TierBadge tier="paid" />` with gradient fire styling
- No upsell CTA block
- Subtle premium border/glow on the outer container
- Section cards have score-based accent coloring on the left border

**Code reuse:** The individual card rendering (Score, TopIssues, ATS, Section, RewrittenBullets, Cross-sell) are largely the same JSX as in `RoastResults.tsx`. Extract shared elements inline rather than creating separate sub-components — keep it simple for now.

---

### 7. Modify: `src/components/RoastResults.tsx`

**Changes:**
- Add `<TierBadge tier="free" />` in the score header card
- Update `isFree` logic to use `result.tier` field with fallback: `const isFree = result.tier !== "paid"`
- Keep the existing upsell CTA as-is (it already shows for free tier only)

---

### 8. Modify: `src/components/SharedRoastView.tsx`

**Change:** Conditionally render `RoastResultsFull` or `RoastResults` based on the result's tier.

```tsx
import { RoastResultsFull } from "@/components/RoastResultsFull";
import { RoastResults } from "@/components/RoastResults";

// In render:
const isPaid = result.tier === "paid" || result.rewrittenBullets.length > 0;
isPaid
  ? <RoastResultsFull result={result} onReset={() => router.push("/")} />
  : <RoastResults result={result} onReset={() => router.push("/")} />
```

---

### 9. Modify: `src/app/globals.css`

**Change:** Add a premium glow keyframe/utility for paid tier cards (optional, subtle).

```css
@keyframes premium-glow {
  0%, 100% { box-shadow: 0 0 20px oklch(0.80 0.14 85 / 0.1); }
  50% { box-shadow: 0 0 40px oklch(0.80 0.14 85 / 0.2); }
}

.glow-premium {
  animation: premium-glow 4s ease-in-out infinite;
}
```

---

## How to Test Paid Tier Locally

### Method 1: Query Parameter (Primary)

Navigate to `http://localhost:3000?tier=paid`, then submit a resume. The app reads `?tier=paid` from the URL, passes it to the API, and the AI returns a full roast response.

**Implementation:** `page.tsx` uses `useSearchParams()` to read the `tier` param and passes it to `<ResumeUpload>`.

### Method 2: Direct API Call

```bash
curl -X POST http://localhost:3000/api/roast \
  -F "resumeText=John Smith - Software Engineer..." \
  -F "tier=paid"
```

The API already supports `tier=paid` — no changes needed.

### Method 3: Browser DevTools

In the browser console after a free roast:
```js
// Modify the URL and reload with ?tier=paid
window.location.href = '/?tier=paid'
```

---

## Test Cases

### Unit Tests (`src/lib/__tests__/tier.test.ts`)

| # | Test | Description |
|---|------|-------------|
| 1 | `getTier` returns "free" when tier field is undefined | Backward compat |
| 2 | `getTier` returns "free" when tier field is "free" | Explicit free |
| 3 | `getTier` returns "paid" when tier field is "paid" | Explicit paid |
| 4 | Free result has tier in response after API change | Integration-like |
| 5 | Paid result has tier in response after API change | Integration-like |

### Component Tests (optional, vitest + React Testing Library)

| # | Test | Description |
|---|------|-------------|
| 1 | `TierBadge` renders "Free Roast" for free tier | Badge text |
| 2 | `TierBadge` renders "Full Roast" for paid tier | Badge text |
| 3 | `TierBadge` paid has gradient-fire class | Premium styling |
| 4 | `RoastResults` shows upsell CTA for free tier | Upsell visible |
| 5 | `RoastResultsFull` does NOT show upsell CTA | No upsell |
| 6 | `RoastResultsFull` renders all 5 sections | Section count |
| 7 | `RoastResultsFull` renders rewritten bullets | Bullets visible |
| 8 | `RoastResultsFull` shows "Full Roast" badge | Tier indicator |

### E2E Tests (`e2e/paid-tier.spec.ts`)

| # | Test | Description |
|---|------|-------------|
| 1 | Free roast shows "Free Roast" badge | Tier indicator |
| 2 | Free roast shows upsell CTA | Upsell block visible |
| 3 | Paid roast (`?tier=paid`) shows "Full Roast" badge | Tier indicator |
| 4 | Paid roast shows all 5 section headings | All sections render |
| 5 | Paid roast shows rewritten bullets section | Bullets visible |
| 6 | Paid roast does NOT show upsell CTA | No upsell |
| 7 | Shared paid roast URL renders full results | Permalink + paid |

**E2E approach:** Mock the API (same pattern as `roast-flow.spec.ts`) to return a full paid-tier response with 5 sections and 3 rewritten bullets. This avoids AI API dependency and makes tests fast and deterministic.

**Mock paid response for E2E:**
```ts
const MOCK_PAID_RESPONSE = {
  id: "paid-test-1234",
  overallScore: 65,
  summary: "Detailed paid roast summary...",
  topIssues: ["Issue 1", "Issue 2", "Issue 3", "Issue 4", "Issue 5"],
  atsScore: 58,
  atsIssues: ["ATS issue 1", "ATS issue 2", "ATS issue 3"],
  sections: [
    { name: "Format & Layout", score: 55, roast: "...", tips: ["Tip 1", "Tip 2"] },
    { name: "Work Experience", score: 70, roast: "...", tips: ["Tip 1", "Tip 2"] },
    { name: "Skills & Keywords", score: 60, roast: "...", tips: ["Tip 1", "Tip 2"] },
    { name: "Education & Certs", score: 75, roast: "...", tips: ["Tip 1", "Tip 2"] },
    { name: "Overall Impact", score: 50, roast: "...", tips: ["Tip 1", "Tip 2"] },
  ],
  rewrittenBullets: [
    { original: "Did tasks", rewritten: "Led 5 projects...", why: "Quantified impact" },
    { original: "Helped team", rewritten: "Mentored 3 juniors...", why: "Shows leadership" },
    { original: "Used tools", rewritten: "Architected CI/CD...", why: "Specificity" },
  ],
  tier: "paid",
  createdAt: new Date().toISOString(),
};
```

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/types.ts` | Modify | Add optional `tier` field to `RoastResult` |
| `src/app/api/roast/route.ts` | Modify | Include `tier` in response |
| `src/app/page.tsx` | Modify | Read `?tier=paid`, pass to upload, conditional render |
| `src/components/ResumeUpload.tsx` | Modify | Accept `tier` prop, send in formData |
| `src/components/TierBadge.tsx` | Create | Tier indicator badge component |
| `src/components/RoastResultsFull.tsx` | Create | Full paid-tier results component |
| `src/components/RoastResults.tsx` | Modify | Add TierBadge, update isFree logic |
| `src/components/SharedRoastView.tsx` | Modify | Conditional render based on tier |
| `src/app/globals.css` | Modify | Add premium glow utility |
| `src/lib/__tests__/tier.test.ts` | Create | Unit tests for tier logic |
| `e2e/paid-tier.spec.ts` | Create | E2E tests for paid tier UI |

**Total: 5 files modified, 4 files created**

---

## Implementation Notes

1. **No payment flow** — Sprint 4 handles Stripe. This sprint only builds the UI and uses `?tier=paid` for testing.
2. **Backward compatibility** — The `tier` field is optional in `RoastResult`. Existing share URLs and DB records (which lack `tier`) will fall back to the `rewrittenBullets.length` check.
3. **The API already works** — `POST /api/roast` already accepts `tier=paid` and the prompt returns 5 sections + 3 rewritten bullets. No AI/prompt changes needed.
4. **DB already stores tier** — The `Roast` model has a `tier` field (`@default("free")`). No schema changes needed.
5. **Share encoding** — The `share.ts` encode/decode functions don't include `tier`, so shared URLs of paid results will fall back to detecting via `rewrittenBullets.length > 0`. This is acceptable for now.
