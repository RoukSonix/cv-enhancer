# Project Status

**Last updated:** 2026-03-12 (Sprint 2)

## Current State

### Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | Working | Fire theme, animations, feature pills |
| Paste Text input | Working | Textarea with validation |
| Upload PDF input | Working | Drag-drop UI, file picker |
| AI Roast (free tier) | Working | MiniMax M2.5 via OpenRouter |
| Loading animation | Working | Progress bar, rotating jokes |
| Results: Overall Score | Working | Animated ring, score badge (Dumpster Fire -> Chef's Kiss) |
| Results: Summary | Working | AI-generated roast text |
| Results: Top Issues | Working | 3 numbered issues |
| Results: ATS Score | Working | Score bar + issues list |
| Results: First Impression | Working | Score, roast text, 3 tips |
| Results: Upsell blocks | Working | UI only, no payment logic |
| "Roast Another" button | Working | Resets to upload form |
| Docker dev setup | Working | `docker compose up -d` on port 3000 |
| Share Results (lz-string) | Working | `/roast?r=<encoded>` share link (backward compat) |
| Share Results (permalink) | Working | `/roast/[id]` short URLs from database |
| PostgreSQL database | Working | Roast results persisted via Prisma ORM |
| GET /api/roast/[id] | Working | Fetch saved roast by nanoid |
| OG meta tags (permalink) | Working | `generateMetadata` with React `cache()` dedup |

### Not Implemented (Stubs / Missing)

| Feature | Status | Priority |
|---------|--------|----------|
| PDF Upload validation | Needs manual testing | Medium |
| Payments (Stripe/LemonSqueezy) | Not started | High |
| Full Roast (paid tier) | API supports it, UI doesn't trigger | High |
| Email capture | Not started | Medium |
| Auth | Not started | Low |
| Deploy (Vercel) | Not started | Medium |
| Domain + DNS | Not started | Medium |
| OG images for social sharing | Not started | Medium |
| Template Pack page | Not started | Low |
| Rewrite Service page | Not started | Low |

### Implemented (Sprint 2)

- PostgreSQL database via Docker Compose (postgres:17-alpine with healthcheck)
- Prisma ORM with `Roast` model (id, resumeText, resumeHash, tier, result JSON, overallScore)
- nanoid(12) for short, URL-safe roast IDs
- `POST /api/roast` saves results to DB (graceful degradation if DB unavailable)
- `GET /api/roast/[id]` endpoint to fetch saved results
- `/roast/[id]` dynamic page with `generateMetadata` and React `cache()` dedup
- `buildShareUrlById` for short permalink URLs
- Share button uses `/roast/[id]` permalinks
- Backward compatibility: `/roast?r=<encoded>` still works unchanged
- Prisma client singleton pattern for Next.js hot reload
- `postinstall` script for `prisma generate`
- Dockerfile updated with `prisma generate` and `prisma db push`
- Unit tests for nanoid, resumeHash, and buildShareUrlById (9 new tests)

### Implemented (Sprint 1)

- Shareable roast results via URL-encoded query params (`/roast?r=<lz-string>`)
- OG meta tags (og:title, og:description, twitter:card) on shared results page
- `src/lib/share.ts`: encode/decode/buildShareUrl with lz-string compression and key minification
- `src/app/roast/page.tsx`: server component with `generateMetadata` and error states
- `src/components/SharedRoastView.tsx`: client wrapper with "Get your own roast" CTA
- Share button on main page now generates proper share URLs
- Vitest test suite with 14 unit tests (encoding round-trips, validation, edge cases)
- Schema versioning (`v: 1`) for future backwards compatibility

### Fixed (Sprint 0)

- "Share Results" button now copies URL to clipboard + shows toast (#1)
- "Get Full Roast -- $9.99" button shows "Coming soon!" toast (#2)
- "Resume Template Pack -- $29" button shows "Coming soon!" toast (#2)
- "Professional Rewrite -- $99" button shows "Coming soon!" toast (#2)
- Social proof numbers replaced with honest value props ("Free instant feedback", "No signup required") (#3)
- Added `sonner` toast library via shadcn/ui (`<Toaster />` in root layout)

### Known Issues

- No error toast/notification on API failure (only inline text)
- No favicon customization (uses default Next.js)

## Tech Stack

- **Framework:** Next.js 16.1.6 (Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + tw-animate-css
- **UI Components:** shadcn/ui (Radix UI)
- **Icons:** Lucide React
- **AI:** OpenRouter API (MiniMax M2.5) via OpenAI SDK
- **PDF Parsing:** pdf-parse
- **Database:** PostgreSQL 17 (Alpine) via Prisma 7
- **Runtime:** Node.js 22 (Alpine Docker)
- **Container:** Docker Compose

## Architecture

```
src/
├── app/
│   ├── api/roast/
│   │   ├── route.ts             # POST: PDF/text -> AI roast + DB save
│   │   └── [id]/route.ts       # GET: fetch saved roast by ID (Sprint 2)
│   ├── roast/
│   │   ├── page.tsx             # Shared results via ?r= query param (Sprint 1)
│   │   └── [id]/page.tsx        # Permalink results from DB (Sprint 2)
│   ├── layout.tsx               # Root layout (dark theme, Geist fonts)
│   ├── page.tsx                 # Main page (landing + results)
│   └── globals.css              # Global styles, fire theme
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── AnimatedScore.tsx        # Animated score ring
│   ├── FireParticles.tsx        # Background fire particles
│   ├── LoadingRoast.tsx         # Loading state with jokes
│   ├── ResumeUpload.tsx         # Upload/paste form
│   ├── RoastResults.tsx         # Results display
│   └── SharedRoastView.tsx      # Client wrapper for shared results (Sprint 1)
├── generated/prisma/            # Prisma generated client (Sprint 2)
└── lib/
    ├── __tests__/
    │   ├── share.test.ts        # Unit tests for share encoding/decoding
    │   └── roast-db.test.ts     # Unit tests for nanoid, hash, permalink (Sprint 2)
    ├── openrouter.ts            # OpenRouter client config
    ├── prisma.ts                # Prisma client singleton (Sprint 2)
    ├── prompt.ts                # Free/paid roast prompts
    ├── score.ts                 # Score label utility
    ├── share.ts                 # Share URL encode/decode + buildShareUrlById
    ├── types.ts                 # TypeScript interfaces
    └── utils.ts                 # Utility functions
prisma/
└── schema.prisma                # Prisma schema with Roast model (Sprint 2)
```
