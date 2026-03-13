# Sprint 7: OG Images & Social Sharing — Implementation Plan

**Created:** 2026-03-13
**Sprint goal:** Generate dynamic social preview images for shared roast results (viral loop)
**Branch:** `feat/og-images-social-sharing`

---

## 1. Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/og/[id]/route.tsx` | API route: generates OG image PNG for a roast by database ID |
| `src/app/api/og/route.tsx` | API route: generates OG image PNG for `/roast?r=<encoded>` share URLs |
| `src/components/ShareButtons.tsx` | "Share on Twitter" and "Share on LinkedIn" client component |
| `src/lib/__tests__/og.test.ts` | Unit tests for OG image helper functions |
| `e2e/og-image.spec.ts` | E2E tests for OG image generation and meta tags |

## 2. Files to Modify

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | **Add `metadataBase`** to root metadata (required for social crawlers to resolve relative OG image URLs to absolute) |
| `src/app/roast/[id]/page.tsx` | Add `og:image` and `twitter:card: summary_large_image` to `generateMetadata` |
| `src/app/roast/page.tsx` | Add `og:image` and `twitter:card: summary_large_image` to `generateMetadata` |
| `src/components/SharedRoastView.tsx` | Add `<ShareButtons>` component below results |
| `src/components/RoastResults.tsx` | Add `<ShareButtons>` component below "Roast Another" button |
| `src/components/RoastResultsFull.tsx` | Add `<ShareButtons>` component below "Roast Another" button |
| `package.json` | Add `@vercel/og` dependency (works outside Vercel via Satori internally) |
| `.env.example` | Add `NEXT_PUBLIC_BASE_URL` env var |

---

## 3. OG Image Design Spec

### Layout (1200×630 px)

```
┌─────────────────────────────────────────────────────────────┐
│  (dark background with subtle radial gradient)              │
│                                                             │
│         🔥  RESUME ROASTER                                  │
│                                                             │
│              ┌─────────────┐                                │
│              │             │                                │
│              │     72      │  ← Big score number (128px)    │
│              │    /100     │  ← Smaller denominator (32px)  │
│              │             │                                │
│              └─────────────┘                                │
│                                                             │
│           [ Needs Work ]      ← Score label badge           │
│                                                             │
│    "Your resume reads like a..." ← Summary preview (2 lines)│
│                                                             │
│         resumeroaster.com     ← Branding footer             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Colors

| Element | Color | Notes |
|---------|-------|-------|
| Background | `#1a1410` (warm dark brown) | Matches app dark theme `oklch(0.13 0.005 60)` |
| Background gradient | Radial from `#f97316` at 8% opacity at top | Matches app ambient glow |
| Score number | White `#f5f5f0` | High contrast |
| Score circle border | Score-dependent gradient | `≥80: emerald (#10b981)`, `≥60: amber (#f59e0b)`, `<60: fire-orange (#f97316) → fire-red (#ef4444)` |
| Score label badge | Same score-dependent colors | Background at 15% opacity, text in full color |
| Summary text | `#a8a090` (muted foreground) | Matches `--muted-foreground` |
| Brand text | `#f97316` (fire-orange) | Consistent brand color |
| "RESUME ROASTER" title | White with fire gradient | Gradient: `#fbbf24 → #f97316 → #ef4444` |

### Typography

- Score number: **Inter Bold 128px** (or system sans-serif bold)
- "/100" denominator: **Inter Regular 32px**
- Score label: **Inter SemiBold 28px**
- Summary: **Inter Regular 22px**, max 2 lines, ellipsis overflow
- Brand: **Inter Medium 18px**
- "RESUME ROASTER" header: **Inter Bold 24px**

### Score Circle

- 160px diameter circle with 8px stroke
- Stroke color follows score-dependent gradient
- Fill: transparent (dark background shows through)
- Score number centered inside

### Font Loading

Use `@vercel/og`'s font loading with Inter fetched from Google Fonts (or bundled in `public/fonts/`). Satori requires explicit font data — cannot use CSS `@font-face`.

**Recommendation:** Bundle `Inter-Bold.ttf` and `Inter-Regular.ttf` in `public/fonts/` to avoid external fetch latency.

---

## 4. API Route Design

### `GET /api/og/[id]` — Database roast OG image

```
Request:  GET /api/og/abc123def456
Response: image/png, 1200×630

Steps:
1. Read `id` from route params
2. Fetch roast from database: prisma.roast.findUnique({ where: { id } })
3. If not found → return 404 with fallback "Not Found" image
4. Extract: overallScore, summary, tier from result JSON
5. Compute scoreLabel(overallScore) and score color
6. Render JSX template with @vercel/og ImageResponse
7. Return PNG with Cache-Control headers
```

### `GET /api/og` — Encoded payload OG image

```
Request:  GET /api/og?r=<lz-string-encoded>
Response: image/png, 1200×630

Steps:
1. Read `r` from searchParams
2. Decode with decodeRoastResult(r)
3. If decode fails → return 404 with fallback image
4. Extract: overallScore, summary
5. Render same JSX template
6. Return PNG with Cache-Control headers
```

### Response Headers

```
Content-Type: image/png
Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400
```

- `max-age=86400`: Browser caches for 1 day
- `s-maxage=604800`: CDN/proxy caches for 7 days
- `stale-while-revalidate=86400`: Serve stale for 1 day while revalidating

### Error/Fallback Image

When roast not found or decode fails, return a generic branded OG image:
- Same dark background
- "Resume Roaster" branding
- "Get your resume roasted" tagline
- Fire emoji
- Still returns 200 (social crawlers don't handle non-200 well)

### Runtime

Use `export const runtime = 'nodejs'` (not edge) since the app deploys to Hetzner via Docker, not Vercel Edge. `@vercel/og` supports Node.js runtime.

---

## 5. Meta Tags Structure

### PREREQUISITE: Add `metadataBase` to root layout

**Critical:** Without `metadataBase`, Next.js cannot resolve relative OG image URLs
to absolute URLs. Social crawlers (Twitter, Facebook, LinkedIn) require absolute URLs
for `og:image`. The root layout currently has NO `metadataBase` set.

Add to `src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://resumeroaster.com"),
  // ... existing metadata
};
```

Add to `.env.example` and `.env.local`:
```
NEXT_PUBLIC_BASE_URL=https://resumeroaster.com
```

This allows relative URLs like `/api/og/abc123` in `generateMetadata` to automatically
resolve to `https://resumeroaster.com/api/og/abc123` in the rendered meta tags.

### `/roast/[id]/page.tsx` — Updated `generateMetadata`

```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const roast = await getRoast(id);

  if (!roast) {
    return { title: "Not Found | Resume Roaster" };
  }

  const result = roast.result as unknown as RoastResult;
  const score = result.overallScore;
  const label = scoreLabel(score);
  const description = result.summary.slice(0, 160);

  // Relative URL — resolved to absolute by metadataBase in root layout
  const ogImageUrl = `/api/og/${id}`;

  return {
    title: `Resume Score: ${score}/100 — ${label} | Resume Roaster`,
    description,
    openGraph: {
      title: `Resume Score: ${score}/100 — ${label}`,
      description,
      type: "article",
      siteName: "Resume Roaster",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Resume score: ${score}/100 — ${label}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",      // Changed from "summary"
      title: `Resume Score: ${score}/100 — ${label}`,
      description,
      images: [ogImageUrl],
    },
  };
}
```

### `/roast/page.tsx` — Updated `generateMetadata`

Same structure but uses `/api/og?r=<encoded>` as the image URL.

### Full Meta Tag Output (rendered HTML)

```html
<!-- Open Graph -->
<meta property="og:title" content="Resume Score: 72/100 — Needs Work" />
<meta property="og:description" content="Your resume reads like a..." />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Resume Roaster" />
<meta property="og:image" content="https://resumeroaster.com/api/og/abc123def456" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Resume score: 72/100 — Needs Work" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Resume Score: 72/100 — Needs Work" />
<meta name="twitter:description" content="Your resume reads like a..." />
<meta name="twitter:image" content="https://resumeroaster.com/api/og/abc123def456" />
```

---

## 6. Share Buttons Implementation

### `src/components/ShareButtons.tsx`

```
Props: { score: number, label: string, url: string }

Buttons:
1. "Share on Twitter/X" — opens Twitter intent URL in new tab
2. "Share on LinkedIn" — opens LinkedIn share URL in new tab
3. "Copy Link" — existing clipboard copy + toast (already implemented, move here)

Layout: Horizontal row of icon buttons with labels, responsive (stack on mobile)
Icons: Use Lucide icons (Twitter → custom X SVG or text, Linkedin, Link2)
```

### Twitter Share URL

```
https://twitter.com/intent/tweet?text=I%20just%20got%20roasted!%20Score%3A%2072%2F100%20%F0%9F%94%A5&url=https%3A%2F%2Fresumeroaster.com%2Froast%2Fabc123
```

Pre-filled text: `I just got roasted! Score: {score}/100 🔥`
URL: appended separately via `&url=` param (Twitter auto-unfurls OG image)

### LinkedIn Share URL

```
https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fresumeroaster.com%2Froast%2Fabc123
```

LinkedIn only takes a URL — it reads OG tags from the page itself.

### Integration Points

The `ShareButtons` component will be added in 3 places:

1. **`SharedRoastView.tsx`**: Below the results, above the footer. URL = current page (`/roast/[id]` or `/roast?r=...`).

2. **`RoastResults.tsx`**: Below the "Roast Another Resume" button. URL = `/roast/{result.id}` (permalink). Only show if `result.id` exists (DB-backed).

3. **`RoastResultsFull.tsx`**: Same placement as RoastResults. URL = `/roast/{result.id}`.

### URL Construction

The share buttons need the full absolute URL. Since these are client components:
- Use `window.location.origin + '/roast/' + result.id` for permalink-based shares
- For `/roast?r=...` pages, use `window.location.href`

---

## 7. Dependency

### `@vercel/og`

```bash
npm install @vercel/og
```

`@vercel/og` wraps Satori (SVG renderer for JSX) + Resvg (SVG→PNG). Works on Node.js runtime — does NOT require Vercel deployment. This is the standard Next.js approach and avoids manually wiring Satori + Sharp.

### Font Files

Download and place in `public/fonts/`:
- `Inter-Bold.ttf` (~300KB)
- `Inter-Regular.ttf` (~300KB)

Load in the OG route handler via `fs.readFile` with `path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')`. This avoids runtime fetches to Google Fonts which add latency and can fail. In Docker, `process.cwd()` resolves to `/app`, and fonts are available because `COPY . .` copies the entire project.

---

## 8. Test Cases

### Unit Tests (`src/lib/__tests__/og.test.ts`)

| # | Test | Description |
|---|------|-------------|
| 1 | Score color mapping | `scoreColor(85)` → emerald, `scoreColor(65)` → amber, `scoreColor(30)` → fire gradient |
| 2 | Score label integration | Verify `scoreLabel` returns correct label for each bracket |
| 3 | Summary truncation | Summary >100 chars gets truncated with ellipsis for OG image |
| 4 | Twitter share URL format | Correct intent URL with encoded score and URL |
| 5 | LinkedIn share URL format | Correct sharing URL with encoded page URL |
| 6 | Share text content | Pre-filled text matches spec: "I just got roasted! Score: X/100 🔥" |

### E2E Tests (`e2e/og-image.spec.ts`)

| # | Test | Description |
|---|------|-------------|
| 1 | OG image returns PNG | `GET /api/og/<valid-id>` returns 200, `content-type: image/png` |
| 2 | OG image caching | Response includes `cache-control` header with `max-age` |
| 3 | OG image 404 fallback | `GET /api/og/nonexistent` returns 200 with fallback PNG |
| 4 | Meta tags on /roast/[id] | Page HTML contains `og:image` meta tag pointing to `/api/og/[id]` |
| 5 | Twitter card meta | Page HTML contains `twitter:card` = `summary_large_image` |
| 6 | Twitter share button | Click "Share on Twitter" → opens correct intent URL |
| 7 | LinkedIn share button | Click "Share on LinkedIn" → opens correct share URL |
| 8 | Copy link button | Click "Copy Link" → clipboard contains permalink URL + toast shown |
| 9 | Encoded URL OG image | `GET /api/og?r=<valid-encoded>` returns 200 PNG |

### Manual Testing Checklist

- [ ] Share URL on Twitter → preview shows OG image with score
- [ ] Share URL on LinkedIn → preview shows OG image with score
- [ ] Share URL on Discord → embed shows OG image
- [ ] Share URL on Facebook → preview shows OG image
- [ ] Share URL on iMessage → link preview shows image
- [ ] Test with score 95 (emerald), 65 (amber), 25 (red) — colors correct
- [ ] OG image loads in < 500ms (warm cache)
- [ ] OG image renders correctly with very long summary text (truncation)
- [ ] OG image renders correctly with short summary text
- [ ] Use [opengraph.xyz](https://opengraph.xyz) or Twitter Card Validator to verify

---

## 9. Implementation Order

1. **Add `metadataBase`** to `src/app/layout.tsx` + `NEXT_PUBLIC_BASE_URL` to `.env.example`
2. Install `@vercel/og`, add font files to `public/fonts/`
3. Create `GET /api/og/[id]/route.tsx` with JSX template + caching
4. Create `GET /api/og/route.tsx` for encoded URLs
5. Update `generateMetadata` in `/roast/[id]/page.tsx` (og:image + twitter card)
6. Update `generateMetadata` in `/roast/page.tsx` (og:image + twitter card)
7. Create `ShareButtons.tsx` component
8. Integrate ShareButtons into `SharedRoastView`, `RoastResults`, `RoastResultsFull`
9. Write unit tests
10. Write E2E tests
11. Manual testing with social platform debuggers

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `@vercel/og` font loading fails in Docker | Bundle fonts in `public/fonts/`, load via `fs.readFile` with absolute path |
| Social crawlers timeout on image generation | Cache-Control headers + keep template simple (no external fetches in render) |
| Very long summary breaks layout | Truncate to 100 chars with ellipsis in OG template |
| Encoded URL too long for OG image URL | `/api/og?r=...` URL could exceed limits; mitigated by social platforms primarily using `/roast/[id]` permalinks |
| Resvg/Satori missing native deps in Docker | `@vercel/og` bundles WASM-based Resvg — no native deps needed |

---

## 11. Out of Scope

- Favicon customization (separate task)
- Open Graph video/animation
- Custom share images for different tiers (free vs paid)
- Share to WhatsApp, Telegram, etc. (can add later)
- Analytics tracking on share button clicks (Sprint 9)

---

## Validation: APPROVED

**Validated:** 2026-03-13
**Validator:** Claude Opus 4.6 (validation agent)

### Checklist

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `@vercel/og` works outside Vercel (Docker/standalone) | PASS | Uses WASM-based Resvg — no native deps. `node:22-alpine` is fine. `runtime = 'nodejs'` is correct for Hetzner/Docker deployment. |
| 2 | OG image API route design correct for App Router | PASS | `src/app/api/og/[id]/route.tsx` and `src/app/api/og/route.tsx` follow correct App Router conventions. `ImageResponse` usage is standard. |
| 3 | Font loading works in Docker | PASS | Bundling fonts in `public/fonts/` and loading via `fs.readFile(path.join(process.cwd(), ...))` works because `COPY . .` in Dockerfile copies fonts. No external fetch dependency. |
| 4 | Meta tags structured correctly for `generateMetadata` | **FIXED** | **Original plan had no `metadataBase`** — relative OG image URLs (`/api/og/...`) would NOT resolve to absolute URLs for social crawlers. Fixed: added `metadataBase` step to root layout using `NEXT_PUBLIC_BASE_URL` env var. |
| 5 | Share buttons work correctly | PASS | Twitter intent URL format (`twitter.com/intent/tweet?text=...&url=...`) and LinkedIn share URL (`linkedin.com/sharing/share-offsite/?url=...`) are both correct and standard. |
| 6 | Cache headers appropriate | PASS | `max-age=86400, s-maxage=604800, stale-while-revalidate=86400` is appropriate for immutable roast results. Fallback image returning 200 is correct (social crawlers don't handle non-200). |
| 7 | Existing E2E tests break | PASS (no breakage) | Changes are purely additive: new API routes, new meta tags, new component. No existing elements are removed or relocated. |
| 8 | `/api/og?r=` lz-string decoding correct | PASS | Reuses existing `decodeRoastResult()` from `src/lib/share.ts` which handles decompression, JSON parsing, and validation with proper null returns on failure. |

### Issues Found & Fixed

1. **CRITICAL — Missing `metadataBase` (fixed in plan)**
   - **Problem:** Root layout (`src/app/layout.tsx`) had no `metadataBase`. Social crawlers require absolute `og:image` URLs. Without `metadataBase`, Next.js cannot resolve the relative `/api/og/...` paths to `https://resumeroaster.com/api/og/...`.
   - **Fix:** Added step 1 to implementation order: set `metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://resumeroaster.com")` in root layout metadata. Added `NEXT_PUBLIC_BASE_URL` to `.env.example`.

2. **Minor — Font path resolution clarified (improved in plan)**
   - **Problem:** Plan said "load via `fs.readFile`" without specifying path construction.
   - **Fix:** Clarified to use `path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')` and noted why this works in Docker (`COPY . .` copies fonts, `process.cwd()` = `/app`).

### Advisory Notes (no action required)

- **`next/og` alternative:** Next.js 16 bundles `next/og` which re-exports `@vercel/og`. Could skip the `@vercel/og` dependency and use `import { ImageResponse } from 'next/og'` directly. Either approach works; using `@vercel/og` explicitly is fine for clarity.
- **Dockerfile runs dev mode:** The Dockerfile uses `npm run dev`, not a production build. `@vercel/og` works in both modes, but production (`npm run build && npm start`) would yield better OG image generation performance. This is a pre-existing concern, not Sprint 7 specific.
