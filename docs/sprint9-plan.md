# Sprint 9: Analytics & Real Metrics — Plan

**Created:** 2026-03-14
**Goal:** Track usage, replace hardcoded social proof with real DB data, add user ratings, build admin dashboard.
**Policy:** DB-only approach first — no external analytics service dependency for MVP.

---

## Architecture Decisions

### No External Analytics Service (for MVP)
- Skip Plausible/PostHog for now — adds complexity, JS bundle size, and a third-party dependency
- Track all events via our own DB (we already have Prisma + PostgreSQL)
- We already store every roast with `createdAt`, `tier`, `paid`, `overallScore` — most stats are just aggregation queries
- Revisit external analytics in a later sprint if needed (PostHog is the preferred choice for self-hosted)

### Caching Strategy
- Use **Next.js `unstable_cache`** (or manual in-memory cache) for the stats endpoint
- Cache TTL: **60 seconds** — balances freshness vs DB load
- Landing page fetches stats via the cached `/api/stats` endpoint at build/request time
- Admin dashboard always fetches fresh (no cache, or short 10s cache)

### Server Component for Social Proof
- Convert the social proof section on the landing page to a **Server Component** that fetches stats at request time (with caching)
- The rest of `page.tsx` stays as a Client Component — wrap the social proof in its own component
- Alternative: fetch stats client-side with SWR/useEffect — simpler, no RSC refactor needed. **Prefer this approach** since page.tsx is already `"use client"` and refactoring to partial RSC adds complexity

---

## DB Schema Changes

### New `Rating` model

```prisma
model Rating {
  id        String   @id @default(cuid())
  roastId   String   @unique          // one rating per roast
  value     Int                       // 1 = thumbs up, -1 = thumbs down
  createdAt DateTime @default(now())

  roast     Roast    @relation(fields: [roastId], references: [id])

  @@index([createdAt])
}
```

### Update `Roast` model

```prisma
model Roast {
  // ... existing fields ...
  rating    Rating?                  // optional 1:1 relation
}
```

**Why a separate model instead of a field on Roast?**
- Clean separation of concerns — rating happens after the roast flow completes
- Easier to query/aggregate ratings independently
- Avoids nullable column on every roast row for a feature most users may not use

**Alternative considered:** `rating Int?` field on `Roast`. Simpler, fewer joins. Either approach works — go with the simpler field-on-Roast approach if the team prefers fewer models.

**Recommendation:** Use the simpler approach — add `rating Int?` directly on `Roast`. One fewer model, one fewer join, and we're not building a reviews system. Update the schema:

```prisma
model Roast {
  // ... existing fields ...
  rating    Int?                     // 1 = thumbs up, -1 = thumbs down, null = no rating
}
```

---

## API Endpoints

### 1. `GET /api/stats` — Public stats for landing page

**Path:** `src/app/api/stats/route.ts`

**Response:**
```json
{
  "totalRoasts": 847,
  "avgRating": 0.82,
  "positiveRatingCount": 156,
  "totalRatings": 190
}
```

**Implementation:**
- `prisma.roast.count()` for total roasts
- `prisma.roast.count({ where: { rating: 1 } })` for positiveRatingCount
- `prisma.roast.count({ where: { rating: { not: null } } })` for totalRatings
- `avgRating = positiveRatingCount / totalRatings` (ratio, 0–1 scale)
- **Do NOT use `prisma.roast.aggregate({ _avg: { rating: true } })`** — that computes SQL AVG over 1/-1 values which gives a different number (e.g., 0.64 vs 0.82)
- Cache result for 60 seconds using `unstable_cache` or a simple in-memory cache with timestamp

### 2. `POST /api/roast/[id]/rate` — Submit rating

**Path:** `src/app/api/roast/[id]/rate/route.ts`

**Request body:**
```json
{ "value": 1 }
```
- `value` must be `1` (thumbs up) or `-1` (thumbs down)

**Response:**
```json
{ "success": true, "value": 1 }
```

**Validation:**
- Roast must exist
- Value must be 1 or -1
- Idempotent: if already rated, update the value (upsert behavior)

### 3. `GET /api/admin/stats` — Admin dashboard data

**Path:** `src/app/api/admin/stats/route.ts`

**Response:**
```json
{
  "totalRoasts": 847,
  "freeRoasts": 720,
  "paidRoasts": 127,
  "conversionRate": 0.15,
  "revenueEstimate": 1269.73,
  "avgScore": 62,
  "avgRating": 0.82,
  "totalRatings": 190,
  "roastsToday": 23,
  "roastsThisWeek": 142,
  "roastsThisMonth": 512
}
```

**Implementation:**
- Multiple Prisma aggregation queries
- Revenue estimate: `(paidSingle * 9.99) + (bundlePurchases * 24.99)` — approximate from paid roast count and credit usage
- **No auth for MVP** — protect with a simple env var token (`ADMIN_TOKEN`) passed as Bearer auth header or query param
- **Also retrofit `ADMIN_TOKEN` check to existing `admin/emails` route** — it currently has zero auth and exposes PII (emails). Apply the same token middleware for consistency.
- Short cache (10s) or no cache

---

## Component Changes

### 1. Landing Page Social Proof — `src/app/page.tsx`

**Current (lines 121-132):** Static text "Trusted by job seekers who can handle the truth" + "Free instant feedback" / "No signup required"

**Change to:** Fetch from `/api/stats` and display real numbers:
```
🔥 847 resumes roasted  •  👍 82% positive ratings
```

**Implementation:**
- Create `src/components/SocialProof.tsx` (client component)
- `useEffect` + `fetch("/api/stats")` on mount
- Show skeleton/placeholder while loading, real numbers when loaded
- Fallback to current static text if fetch fails
- Keep "Free instant feedback" and "No signup required" as static pills below

### 2. Rating Widget — `src/components/RatingWidget.tsx`

**New component** added to both `RoastResults.tsx` and `RoastResultsFull.tsx`:
- Appears below the overall score card
- Two buttons: 👍 (thumbs up) and 👎 (thumbs down)
- Label: "Was this roast helpful?"
- On click: POST to `/api/roast/[id]/rate`
- After rating: show "Thanks for your feedback!" and disable buttons
- Store rated state in `useState` (no persistence needed — one-time action)

**Placement:** Between the overall score card and the Top Issues card in both result components.

### 3. Admin Dashboard — `src/app/admin/page.tsx`

**New page** at `/admin`:
- Simple server-rendered page (or client component fetching `/api/admin/stats`)
- Cards showing: Total Roasts, Paid Roasts, Conversion Rate, Revenue Estimate, Avg Score, Avg Rating, Today/Week/Month counts
- No auth UI for MVP — just token-protected API; page passes token from URL query param or env
- Minimal styling using existing shadcn Card components
- No charts for MVP — just numbers in cards

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Edit | Add `rating Int?` field to Roast model |
| `src/app/api/stats/route.ts` | Create | Public stats endpoint with caching |
| `src/app/api/roast/[id]/rate/route.ts` | Create | Rating submission endpoint |
| `src/app/api/admin/stats/route.ts` | Create | Admin stats endpoint (token-protected) |
| `src/app/admin/page.tsx` | Create | Admin dashboard page |
| `src/components/SocialProof.tsx` | Create | Real stats on landing page |
| `src/components/RatingWidget.tsx` | Create | Thumbs up/down rating widget |
| `src/app/page.tsx` | Edit | Replace static social proof with `<SocialProof />` |
| `src/components/RoastResults.tsx` | Edit | Add `<RatingWidget />` after score card |
| `src/components/RoastResultsFull.tsx` | Edit | Add `<RatingWidget />` after score card |
| `src/app/api/admin/emails/route.ts` | Edit | Add `ADMIN_TOKEN` auth check (currently unprotected PII) |

---

## Caching Detail

```typescript
// src/lib/stats-cache.ts
let cached: { data: Stats; timestamp: number } | null = null;
const TTL = 60_000; // 60 seconds

export async function getPublicStats(): Promise<Stats> {
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.data;
  }
  const data = await queryStats(); // Prisma queries
  cached = { data, timestamp: Date.now() };
  return data;
}
```

Simple in-memory cache. Works for single-server deployment (which is the current setup). No Redis needed.

---

## Test Cases

### Unit Tests (`src/lib/__tests__/stats.test.ts`)
1. `getPublicStats()` returns correct shape with totalRoasts and avgRating
2. `getPublicStats()` returns cached result within TTL
3. `getPublicStats()` refreshes after TTL expires
4. Rating value validation: only accepts 1 or -1
5. Revenue estimate calculation is correct

### API Tests (`src/lib/__tests__/rating.test.ts`)
1. `POST /api/roast/[id]/rate` with valid value → 200 + updates DB
2. `POST /api/roast/[id]/rate` with invalid value → 400
3. `POST /api/roast/[id]/rate` for non-existent roast → 404
4. `POST /api/roast/[id]/rate` twice → updates (upsert), doesn't create duplicate
5. `GET /api/stats` returns correct totals after inserting test roasts
6. `GET /api/admin/stats` without token → 401
7. `GET /api/admin/stats` with valid token → 200 + full stats

### E2E Tests (`e2e/analytics.spec.ts`)
1. Landing page shows real roast count (not "0" on fresh DB — handle gracefully)
2. After submitting a roast, rating widget appears
3. Click thumbs up → "Thanks" message shown → button disabled
4. Landing page count updates (within cache TTL)
5. `/admin?token=...` page loads and shows stat cards

---

## Implementation Order

1. **Schema migration** — add `rating` field, run `prisma migrate dev`
2. **Stats cache** — `src/lib/stats-cache.ts`
3. **GET /api/stats** — public stats endpoint
4. **POST /api/roast/[id]/rate** — rating endpoint
5. **SocialProof component** — replace static text on landing page
6. **RatingWidget component** — add to both result components
7. **GET /api/admin/stats** — admin stats endpoint
8. **Admin page** — `/admin` dashboard
9. **Tests** — unit + API + E2E
10. **Polish** — loading states, error handling, edge cases

---

## Out of Scope (Deferred)

- External analytics (PostHog/Plausible) — revisit post-launch
- Charts/graphs on admin dashboard — numbers-only for MVP
- User authentication for admin — token-based for now
- Event tracking beyond DB (page views, click events) — not needed until we have real traffic
- A/B testing — post-launch concern

---

## Validation: APPROVED

**Reviewed:** 2026-03-14 | **Verdict:** Approved with 2 fixes applied

### Issues Found & Fixed

1. **`avgRating` calculation bug risk (Fixed)**
   - The example stats showed `avgRating: 0.82` with 156/190 positive ratings, which is a ratio (`positiveCount / totalCount = 0.82`). But the implementation section said to use `prisma.roast.aggregate()`, which computes SQL `AVG()` over 1/-1 values = `(156 - 34) / 190 = 0.642`. These produce different numbers. **Fix:** Explicitly specified to compute `positiveRatingCount / totalRatings` instead of SQL AVG.

2. **Existing `admin/emails` has no auth (Fixed)**
   - The plan adds `ADMIN_TOKEN` protection to the new `admin/stats` endpoint, but the existing `admin/emails` route exposes PII (emails, opt-in status) with zero authentication. **Fix:** Added `admin/emails` to the file changes list to retrofit the same token check.

### Validation Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | `rating Int?` on Roast vs separate table | ✅ Correct — simpler, no joins, not a reviews system |
| 2 | In-memory cache in serverless/Docker | ✅ Fine — single-process Docker deployment, acknowledged |
| 3 | `/api/stats` PII safety | ✅ Only returns aggregates (counts, averages) |
| 4 | Admin page auth | ✅ Token-based adequate for MVP |
| 5 | API endpoint RESTful consistency | ✅ Nests under existing `/api/roast/[id]` pattern |
| 6 | Existing E2E test breakage | ✅ No — static pills ("Free instant feedback", "No signup required") preserved |
| 7 | Caching strategy for expected traffic | ✅ 60s TTL sufficient for early traffic |
| 8 | Rating system 1/-1 vs boolean | ✅ 1/-1 is fine — clarified aggregation math |
