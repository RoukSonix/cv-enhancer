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
| `src/app/roast/[id]/page.tsx` | Add `og:image` and `twitter:card: summary_large_image` to `generateMetadata` |
| `src/app/roast/page.tsx` | Add `og:image` and `twitter:card: summary_large_image` to `generateMetadata` |
| `src/components/SharedRoastView.tsx` | Add `<ShareButtons>` component below results |
| `src/components/RoastResults.tsx` | Add `<ShareButtons>` component below "Roast Another" button |
| `src/components/RoastResultsFull.tsx` | Add `<ShareButtons>` component below "Roast Another" button |
| `package.json` | Add `@vercel/og` dependency (works outside Vercel via Satori internally) |

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

  // Build absolute OG image URL
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

Load at build time in the OG route handler via `fs.readFile`. This avoids runtime fetches to Google Fonts which add latency and can fail.

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

1. Install `@vercel/og`, add font files
2. Create `GET /api/og/[id]/route.tsx` with JSX template + caching
3. Create `GET /api/og/route.tsx` for encoded URLs
4. Update `generateMetadata` in `/roast/[id]/page.tsx` (og:image + twitter card)
5. Update `generateMetadata` in `/roast/page.tsx` (og:image + twitter card)
6. Create `ShareButtons.tsx` component
7. Integrate ShareButtons into `SharedRoastView`, `RoastResults`, `RoastResultsFull`
8. Write unit tests
9. Write E2E tests
10. Manual testing with social platform debuggers

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
