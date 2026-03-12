# Sprint 2: Database & Persistent Results — Implementation Plan

**Created:** 2026-03-12
**Branch:** `sprint2/database`
**Goal:** Add PostgreSQL database to persist roast results and create short shareable URLs.

---

## Overview

Currently, shared roast links use lz-string-encoded query params (`/roast?r=<encoded>`). This works but produces long URLs that can break on some platforms. Sprint 2 adds a PostgreSQL database to persist results server-side and generates short `/roast/[id]` URLs. The old `?r=` format continues to work as a fallback.

---

## 1. New Dependencies

```bash
npm install @prisma/client nanoid
npm install -D prisma
```

- **prisma / @prisma/client** — ORM for PostgreSQL
- **nanoid** — short, URL-safe unique IDs (21 chars by default; we'll use 12)

---

## 2. Prisma Setup

### 2.1 Initialize Prisma

```bash
npx prisma init --datasource-provider postgresql
```

This creates:
- `prisma/schema.prisma`
- Updates `.env` (we'll use `.env.local` instead)

### 2.2 Schema Definition

**File: `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Roast {
  id           String   @id              // nanoid, 12 chars
  resumeText   String                    // original resume text (for future re-roasting)
  resumeHash   String                    // SHA-256 hash of resumeText (for dedup lookups)
  tier         String   @default("free") // "free" or "paid"
  result       Json                      // full RoastResult JSON
  overallScore Int                       // denormalized for queries/sorting
  createdAt    DateTime @default(now())

  @@index([resumeHash])
  @@index([createdAt])
}
```

**Design decisions:**
- `id` is a nanoid (12 chars) — short enough for URLs, collision-safe at our scale
- `resumeText` stored for potential future re-roasting with different models
- `resumeHash` indexed for dedup lookups (e.g., "you already roasted this resume")
- `result` is a JSON column storing the full `RoastResult` object
- `overallScore` denormalized as an integer for efficient queries (leaderboards, analytics)
- No foreign keys yet — `User` model comes in Sprint 11

### 2.3 Prisma Client Singleton

**File: `src/lib/prisma.ts`** (NEW)

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

This prevents multiple Prisma instances during Next.js hot reload in development.

---

## 3. Docker Compose Changes

**File: `docker-compose.yml`** (MODIFY)

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: cv-enhancer-db
    environment:
      POSTGRES_USER: cvenhancer
      POSTGRES_PASSWORD: cvenhancer
      POSTGRES_DB: cvenhancer
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cvenhancer"]
      interval: 5s
      timeout: 3s
      retries: 5

  app:
    build: .
    container_name: cv-enhancer
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    environment:
      DATABASE_URL: postgresql://cvenhancer:cvenhancer@db:5432/cvenhancer
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:
```

**Changes:**
- Add `db` service (PostgreSQL 17 Alpine) with healthcheck
- Add `DATABASE_URL` env var to `app` service (overrides any value in `.env.local`)
- Add `depends_on` with `service_healthy` condition so app waits for DB
- Add `pgdata` named volume for data persistence across restarts

---

## 4. Dockerfile Changes

**File: `Dockerfile`** (MODIFY)

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Run migrations then start dev server
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
```

**Changes:**
- Add `RUN npx prisma generate` after `COPY . .` to generate the Prisma client
- Change `CMD` to run `prisma db push` before starting the dev server (applies schema to DB on container start)
- Using `prisma db push` instead of `prisma migrate deploy` for dev simplicity — migrations can be adopted later for production

---

## 5. Environment Variables

**File: `.env.example`** (MODIFY)

Add:
```env
# Database (PostgreSQL)
# Docker Compose sets this automatically; only needed for local dev without Docker
DATABASE_URL=postgresql://cvenhancer:cvenhancer@localhost:5432/cvenhancer
```

---

## 6. API Route Changes

### 6.1 POST /api/roast — Save Result to DB

**File: `src/app/api/roast/route.ts`** (MODIFY)

After the AI response is parsed and `result` is constructed:

1. Import `prisma` from `@/lib/prisma`, `nanoid` from `nanoid`, and `type { Prisma }` from `@prisma/client`
2. Import `createHash` from `crypto` (Node.js built-in)
3. Replace `crypto.randomUUID()` with `nanoid(12)` for the result `id`
4. Compute `resumeHash = createHash('sha256').update(resumeText).digest('hex')`
5. Save to DB:
   ```typescript
   await prisma.roast.create({
     data: {
       id: result.id,
       resumeText,
       resumeHash,
       tier,
       result: result as unknown as Prisma.JsonObject,
       overallScore: result.overallScore,
     },
   });
   ```
6. Return the result as before (the client already receives the `id`)

**Error handling:** If DB save fails, log the error but still return the result to the user. The roast is still useful even if persistence fails. Log a warning so we can monitor.

### 6.2 GET /api/roast/[id] — Fetch Saved Result

**File: `src/app/api/roast/[id]/route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const roast = await prisma.roast.findUnique({
    where: { id },
    select: { result: true },
  });

  if (!roast) {
    return NextResponse.json(
      { error: "Roast not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(roast.result);
}
```

---

## 7. Dynamic Route: /roast/[id]

### 7.1 Server Page

**File: `src/app/roast/[id]/page.tsx`** (NEW)

```typescript
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SharedRoastView } from "@/components/SharedRoastView";
import { scoreLabel } from "@/lib/score";
import type { RoastResult } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Deduplicate the DB query between generateMetadata and the page component.
// React cache() ensures the query runs only once per request.
const getRoast = cache(async (id: string) => {
  const roast = await prisma.roast.findUnique({
    where: { id },
    select: { result: true },
  });
  return roast;
});

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

  return {
    title: `Resume Score: ${score}/100 — ${label} | Resume Roaster`,
    description,
    openGraph: {
      title: `Resume Score: ${score}/100 — ${label}`,
      description,
      type: "article",
      siteName: "Resume Roaster",
    },
    twitter: {
      card: "summary",
      title: `Resume Score: ${score}/100 — ${label}`,
      description,
    },
  };
}

export default async function RoastByIdPage({ params }: PageProps) {
  const { id } = await params;
  const roast = await getRoast(id);

  if (!roast) {
    notFound();
  }

  const result = roast.result as unknown as RoastResult;
  return <SharedRoastView result={result} />;
}
```

### 7.2 Not Found Page (optional, reuses existing ErrorState pattern)

Next.js 16 automatically renders a default `not-found` page. The existing app-level not-found handling is sufficient.

---

## 8. Update Share Button

### 8.1 buildShareUrl — Prefer /roast/[id] URLs

**File: `src/lib/share.ts`** (MODIFY)

Add a new function:

```typescript
export function buildShareUrlById(id: string, origin?: string): string {
  const base = origin ?? window.location.origin;
  return `${base}/roast/${id}`;
}
```

The existing `buildShareUrl` (lz-string encoded) remains unchanged for backward compatibility.

### 8.2 Main Page Share Button

**File: `src/app/page.tsx`** (MODIFY)

Update the Share button `onClick` to use the new ID-based URL:

```typescript
import { buildShareUrlById } from "@/lib/share";

// In the onClick handler:
const shareUrl = buildShareUrlById(result.id);
await navigator.clipboard.writeText(shareUrl);
```

Since the API now returns a nanoid-based `id` (instead of a UUID), the share URL becomes something like `/roast/V1StGXR8_Z5j` — short and clean.

---

## 9. Backward Compatibility: /roast?r= Fallback

**File: `src/app/roast/page.tsx`** — NO CHANGES NEEDED

The existing `/roast` page already handles `?r=<encoded>` query params via `decodeRoastResult`. This continues to work unchanged. Users with old share links will still see their results.

The routing hierarchy:
- `/roast?r=<encoded>` → `src/app/roast/page.tsx` (existing, lz-string decode)
- `/roast/V1StGXR8_Z5j` → `src/app/roast/[id]/page.tsx` (new, DB lookup)

These are separate Next.js routes and don't conflict.

---

## 10. Files Summary

### New Files (5)
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Prisma schema with Roast model |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/app/api/roast/[id]/route.ts` | GET endpoint to fetch saved roast |
| `src/app/roast/[id]/page.tsx` | Dynamic page for DB-backed roast results |
| `src/lib/__tests__/roast-api.test.ts` | Unit tests for DB save logic |

### Modified Files (5)
| File | Changes |
|------|---------|
| `docker-compose.yml` | Add `db` service, `pgdata` volume, `depends_on`, `DATABASE_URL` env |
| `Dockerfile` | Add `prisma generate`, update CMD for `prisma db push` |
| `.env.example` | Add `DATABASE_URL` |
| `src/app/api/roast/route.ts` | Import prisma + nanoid, save result to DB after AI response |
| `src/app/page.tsx` | Use `buildShareUrlById` for share button |
| `src/lib/share.ts` | Add `buildShareUrlById` function |
| `package.json` | New deps: `@prisma/client`, `nanoid`; devDep: `prisma` |

---

## 11. Migration Strategy

### For existing `/roast?r=` share links
- **No migration needed.** The `/roast` page (query-param based) continues to work as-is.
- Old links decode client-side via lz-string — no DB involved.
- New links use `/roast/[id]` — fetched from DB server-side.
- Both routes coexist indefinitely.

### For the database itself
- Using `prisma db push` for development (schema sync without migration files).
- The DB starts empty — no data migration needed since there's no existing data.
- For production deployment (Sprint 7), switch to `prisma migrate deploy` with proper migration history.

---

## 12. Test Cases

### Unit Tests (vitest)

**File: `src/lib/__tests__/roast-api.test.ts`** (NEW)

Tests should mock `prisma` (using vitest mocking) to test the save logic without a real DB:

1. **nanoid generates 12-char ID** — verify the generated ID is exactly 12 characters and URL-safe
2. **resumeHash is deterministic** — same input text produces same SHA-256 hash
3. **resumeHash changes with different input** — different text produces different hash
4. **buildShareUrlById produces correct URL** — `buildShareUrlById("abc123", "https://example.com")` returns `"https://example.com/roast/abc123"`
5. **buildShareUrlById with no origin uses window.location** — (skip in node env or mock window)

**File: `src/lib/__tests__/share.test.ts`** (MODIFY)

Add tests for `buildShareUrlById`:
6. **buildShareUrlById produces /roast/[id] URL** — verify format
7. **buildShareUrlById with special chars in ID** — verify no encoding issues

### Integration Tests (optional, if DB is available in test env)

8. **POST /api/roast saves to DB** — submit a roast, verify a row exists in DB with matching ID
9. **GET /api/roast/[id] returns saved result** — fetch a known ID, verify JSON matches
10. **GET /api/roast/[id] returns 404 for unknown ID** — request a non-existent ID

### E2E Tests (Playwright)

**File: `e2e/share-results.spec.ts`** (MODIFY)

Add new tests for DB-backed share URLs:
11. **`/roast/[id]` renders results from DB** — requires a seeded roast in DB or a full flow test
12. **`/roast/[id]` shows 404 for invalid ID** — navigate to `/roast/nonexistent123`, verify error
13. **Old `/roast?r=` links still work** — existing tests already cover this (no changes needed)

### Existing Tests — Impact Assessment
- **`src/lib/__tests__/share.test.ts`** — All 14 tests should continue passing (no breaking changes to share.ts)
- **`e2e/share-results.spec.ts`** — All 3 tests should continue passing (`/roast?r=` still works)
- **`e2e/roast-flow.spec.ts`** — Should still pass; the API response format is unchanged
- **`e2e/landing.spec.ts`** — Unaffected

---

## 13. Implementation Order

1. **Install dependencies** — `npm install @prisma/client nanoid && npm install -D prisma`
2. **Initialize Prisma** — `npx prisma init --datasource-provider postgresql`
3. **Write schema** — `prisma/schema.prisma` with Roast model
4. **Create Prisma singleton** — `src/lib/prisma.ts`
5. **Update docker-compose.yml** — Add postgres service, volume, env vars
6. **Update Dockerfile** — Add `prisma generate` and `prisma db push`
7. **Update .env.example** — Add `DATABASE_URL`
8. **Modify POST /api/roast** — Save to DB after AI response
9. **Create GET /api/roast/[id]** — New API endpoint
10. **Create /roast/[id] page** — New dynamic route with metadata
11. **Add buildShareUrlById** — New function in `share.ts`
12. **Update share button** — Use ID-based URL in `page.tsx`
13. **Write unit tests** — nanoid, hash, buildShareUrlById
14. **Write E2E tests** — `/roast/[id]` page rendering
15. **Verify backward compat** — Run existing tests, confirm `/roast?r=` still works
16. **Update docs/STATUS.md** — Mark Sprint 2 features as working

---

## 14. Risk Assessment

| Risk | Mitigation |
|------|------------|
| DB connection failure on app start | `depends_on: service_healthy` ensures DB is ready; `prisma db push` retries |
| DB save failure after AI roast | Catch error, log warning, still return result to user (graceful degradation) |
| nanoid collision | At 12 chars with 64-char alphabet, ~2 billion IDs before 1% collision probability — safe at our scale |
| Large `result` JSON in DB | PostgreSQL `jsonb` handles this efficiently; typical roast result is <5KB |
| `prisma db push` in production | Only for dev; Sprint 7 switches to `prisma migrate deploy` |
| Old share URLs breaking | They don't — `/roast?r=` route is unchanged and always decodes client-side |

---

## Validation: APPROVED

**Validated:** 2026-03-12
**Validator:** Claude (Plan Validation Agent)

### Validation Checklist

| Check | Result |
|-------|--------|
| Prisma setup correct for Next.js 16 + Docker | PASS |
| `prisma generate` works in Dockerfile | PASS — runs after `COPY . .` includes schema |
| PostgreSQL healthcheck correct | PASS — `pg_isready -U cvenhancer` available in alpine image |
| App waits for Postgres readiness | PASS — `depends_on: condition: service_healthy` |
| nanoid(12) collision-safe for SaaS | PASS — 64^12 ≈ 4.7×10^21 possibilities |
| `/roast/[id]` vs `/roast?r=` route conflict | PASS — separate Next.js routes, no conflict |
| JSON storage with Prisma + PostgreSQL | PASS — `Json` type maps to `jsonb`, works with `RoastResult` |
| DATABASE_URL format | PASS — Docker uses `db` hostname, `.env.example` uses `localhost` |
| Prisma client singleton pattern | PASS — standard `globalThis` pattern for Next.js |
| Backward compatibility strategy | PASS — old `/roast?r=` links work unchanged |

### Issues Found and Fixed

1. **Double DB query in `/roast/[id]/page.tsx`** — Both `generateMetadata` and the page component called `prisma.roast.findUnique` independently, causing two DB hits per request. **Fixed:** Wrapped the query in React `cache()` to deduplicate within a single request lifecycle.

2. **Missing `Prisma` type import in section 6.1** — The code referenced `Prisma.JsonObject` but the import list only mentioned `prisma` and `nanoid`. **Fixed:** Added `type { Prisma }` from `@prisma/client` to the import list.

### Notes (non-blocking)

- **`nanoid` v5 is ESM-only** — works fine in Next.js API routes and vitest since both handle ESM through their bundlers. No action needed.
- **`prisma/` directory not volume-mounted** — schema changes during development require `docker compose build`. Consider adding `./prisma:/app/prisma` to volumes if frequent schema iteration is expected (optional DX improvement, not required for Sprint 2).
- **`prisma generate` in `postinstall`** — consider adding `"postinstall": "prisma generate"` to package.json scripts for smoother DX when running `npm install` locally (optional).
