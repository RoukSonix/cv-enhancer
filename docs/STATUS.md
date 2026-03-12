# Project Status

**Last updated:** 2026-03-12 (Sprint 6)

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
| Results: Top Issues | Working | 3 (free) or 5 (paid) numbered issues |
| Results: ATS Score | Working | Score bar + 1 (free) or 3 (paid) issues |
| Results: First Impression | Working | Free tier: 1 section, score, roast, 1 tip |
| Results: Full Roast (paid) | Working | 5 sections, score-based accent colors, 2 tips each |
| Results: Rewritten Bullets | Working | 3 bullet rewrites with original → improved + explanation |
| Results: Tier Badge | Working | "Free Roast" / "Full Roast" badge in score header |
| Results: Upsell blocks | Working | Free tier: checkout buttons wired to Stripe |
| Stripe Checkout (single) | Working | $9.99 one-time payment via Stripe hosted checkout |
| Stripe Checkout (bundle) | Working | $24.99 for 3 Full Roasts via Stripe hosted checkout |
| Stripe Webhook | Working | `checkout.session.completed` → mark paid + re-run AI |
| Bundle Credits | Working | Cookie-based credit tracking, redeem via API |
| Payment Success Page | Working | Polls for paid result, auto-redirects to /roast/[id] |
| Payment Cancel Page | Working | Shows retry CTA and link back to free results |
| Upgrade Retry | Working | POST /api/roast/[id]/upgrade retries AI for stuck roasts |
| "Roast Another" button | Working | Resets to upload form |
| Docker dev setup | Working | `docker compose up -d` on port 3000 |
| Share Results (lz-string) | Working | `/roast?r=<encoded>` share link (backward compat) |
| Share Results (permalink) | Working | `/roast/[id]` short URLs from database |
| PostgreSQL database | Working | Roast results persisted via Prisma ORM |
| GET /api/roast/[id] | Working | Fetch saved roast by nanoid |
| OG meta tags (permalink) | Working | `generateMetadata` with React `cache()` dedup |
| Email capture (free tier) | Working | Required for free, optional for paid; stored in DB |
| Marketing opt-in checkbox | Working | GDPR-compliant, unchecked by default |
| Email on results page | Working | Confirmation line below score card |
| Email stripped on shared pages | Working | Server-side stripping in `/roast/[id]` |
| Admin email export | Working | GET `/api/admin/emails` (JSON + CSV, no auth) |
| Toast error notifications | Working | All errors shown via sonner toasts (Sprint 6) |
| File validation (client) | Working | Rejects non-PDF and >5MB with toast (Sprint 6) |
| File validation (server) | Working | 413 response for >5MB uploads (Sprint 6) |
| File info display | Working | Shows file name + size after upload (Sprint 6) |
| API timeout + retry | Working | 30s AbortController timeout, retry UI (Sprint 6) |
| Error boundary | Working | Class component wrapping layout children (Sprint 6) |
| Loading skeleton | Working | Pulsing skeleton for `/roast/[id]` page (Sprint 6) |
| Mobile responsiveness | Working | Responsive padding, text sizing, button stacking (Sprint 6) |

### Not Implemented (Stubs / Missing)

| Feature | Status | Priority |
|---------|--------|----------|
| Auth | Not started | Low |
| Deploy (Vercel) | Not started | Medium |
| Domain + DNS | Not started | Medium |
| OG images for social sharing | Not started | Medium |
| Template Pack page | Not started | Low |
| Rewrite Service page | Not started | Low |

### Implemented (Sprint 6)

- Replaced all inline error text with sonner toast notifications (`toast.error()`)
- Removed `error` and `emailError` state variables from `ResumeUpload.tsx`
- `src/lib/file-validation.ts`: `validateFile()` and `formatFileSize()` utilities
- Client-side file validation at 3 points: file input, drag-drop, and submit (defense-in-depth)
- Server-side file size validation: 413 response for files >5MB in `POST /api/roast`
- File name + size displayed after upload (replaces generic "Click or drop to replace")
- API timeout handling: 30s `AbortController` timeout with dedicated retry UI
- "Try Again" button on timeout state, "Change resume" to return to form
- `src/components/ErrorBoundary.tsx`: React class component error boundary with fire-themed fallback
- ErrorBoundary wraps `{children}` in `layout.tsx` (Toaster stays outside for error-state toasts)
- `src/app/roast/[id]/loading.tsx`: Skeleton loading UI matching results page layout
- Mobile responsiveness: drop zone `p-6 sm:p-10`, segmented control `text-xs sm:text-sm`, retry buttons `flex-col sm:flex-row`
- Email `onBlur` validation converted to `toast.error()`
- Unit tests for `validateFile` and `formatFileSize` (10 tests)
- E2E tests for error flows: API error toast, file info display, timeout retry UI, network error, no inline errors (6 tests)
- Updated `email-capture.spec.ts` to check toast instead of inline error

### Implemented (Sprint 5)

- Email capture on upload form: required for free tier, optional for paid tier
- Prisma schema: `email` (String?) and `marketingOptIn` (Boolean, default false) on Roast, with email index
- `src/lib/email.ts`: `isValidEmail()` utility (shared client + server)
- `ResumeUpload.tsx`: email input, marketing opt-in checkbox, GDPR consent text, client-side validation
- `POST /api/roast`: server-side email validation, stores email + marketingOptIn in DB
- `RoastResults.tsx` / `RoastResultsFull.tsx`: email confirmation line on results page
- `roast/[id]/page.tsx`: strips email server-side before passing to client (privacy)
- `GET /api/admin/emails`: email export endpoint (JSON + CSV), no auth (dev only)
- Unit tests for `isValidEmail()` (8 tests)
- E2E tests for email capture (8 tests)
- Updated existing E2E tests (roast-flow, paid-tier, landing) to fill email

### Implemented (Sprint 4)

- Stripe Checkout integration for single ($9.99) and bundle (3 for $24.99) Full Roast payments
- Prisma schema: `paid`, `stripeSessionId`, `paidAt`, `creditId` fields on Roast; new `Credit` model
- `src/lib/stripe.ts`: Stripe client singleton with env var validation
- `src/lib/roast-ai.ts`: Shared AI call helper (extracted from POST /api/roast for reuse in webhook)
- `POST /api/checkout`: Creates Stripe Checkout sessions with CSRF protection
- `POST /api/webhooks/stripe`: Handles `checkout.session.completed` — marks paid, creates bundle credits, re-runs AI with paid prompt
- `POST /api/checkout/redeem`: Redeems bundle credit for a roast (reads `bundle_token` cookie)
- `GET /api/checkout/credits`: Returns unused credit count for bundle token cookie
- `POST /api/roast/[id]/upgrade`: Retry endpoint for paid roasts stuck on free tier (AI failure recovery)
- `/checkout/success`: Server component sets bundle cookie, client component polls for paid result
- `/checkout/cancel`: Cancel page with retry CTA
- `RoastResults.tsx`: "Get Full Roast" and "3 for $24.99" buttons wired to checkout; "Use Credit" button when credits available
- `RoastResult.paid` field added to types
- Unit tests: stripe env validation, checkout validation, credit redemption, webhook idempotency (26 new tests)

### Implemented (Sprint 3)

- Full paid tier UI: `RoastResultsFull` component renders all 5 sections with score-based accent colors
- `TierBadge` component: "Free Roast" (muted) / "Full Roast" (gradient-fire with crown icon)
- `RoastResult.tier` field: explicit `"free" | "paid"` with backward compat (optional, falls back to `rewrittenBullets.length`)
- API route includes `tier` in response object
- `page.tsx` reads `?tier=paid` query param via `useSearchParams()` with Suspense boundary
- `ResumeUpload` accepts `tier` prop and sends it in formData
- `SharedRoastView` conditionally renders `RoastResultsFull` for paid results
- Premium glow CSS animation (`glow-premium`) for paid tier score card
- Section cards use score-based left border accent (emerald/amber/fire-orange)
- No upsell CTA shown for paid tier results
- Unit tests for tier logic (7 tests)
- E2E tests for paid tier UI with mocked API (6 tests)

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

- No favicon customization (uses default Next.js)
- No `src/app/roast/[id]/error.tsx` for server component errors (ErrorBoundary only catches client-side)

## Tech Stack

- **Framework:** Next.js 16.1.6 (Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + tw-animate-css
- **UI Components:** shadcn/ui (Radix UI)
- **Icons:** Lucide React
- **AI:** OpenRouter API (MiniMax M2.5) via OpenAI SDK
- **PDF Parsing:** pdf-parse
- **Payments:** Stripe (Checkout Sessions + Webhooks)
- **Database:** PostgreSQL 17 (Alpine) via Prisma 7
- **Runtime:** Node.js 22 (Alpine Docker)
- **Container:** Docker Compose

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── emails/route.ts  # GET: email export endpoint (Sprint 5)
│   │   ├── checkout/
│   │   │   ├── route.ts         # POST: create Stripe Checkout session (Sprint 4)
│   │   │   ├── credits/route.ts # GET: check remaining bundle credits (Sprint 4)
│   │   │   └── redeem/route.ts  # POST: redeem bundle credit (Sprint 4)
│   │   ├── roast/
│   │   │   ├── route.ts         # POST: PDF/text -> AI roast + DB save
│   │   │   └── [id]/
│   │   │       ├── route.ts     # GET: fetch saved roast by ID (Sprint 2)
│   │   │       └── upgrade/route.ts # POST: retry AI for stuck paid roasts (Sprint 4)
│   │   └── webhooks/stripe/
│   │       └── route.ts         # POST: Stripe webhook handler (Sprint 4)
│   ├── checkout/
│   │   ├── success/
│   │   │   ├── page.tsx         # Payment success + cookie set (Sprint 4)
│   │   │   └── SuccessPoller.tsx # Client polling component (Sprint 4)
│   │   └── cancel/page.tsx      # Payment cancelled page (Sprint 4)
│   ├── roast/
│   │   ├── page.tsx             # Shared results via ?r= query param (Sprint 1)
│   │   └── [id]/
│   │       ├── page.tsx         # Permalink results from DB (Sprint 2)
│   │       └── loading.tsx      # Skeleton loading UI (Sprint 6)
│   ├── layout.tsx               # Root layout (dark theme, Geist fonts, ErrorBoundary — Sprint 6)
│   ├── page.tsx                 # Main page (landing + results)
│   └── globals.css              # Global styles, fire theme
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── AnimatedScore.tsx        # Animated score ring
│   ├── FireParticles.tsx        # Background fire particles
│   ├── LoadingRoast.tsx         # Loading state with jokes
│   ├── ErrorBoundary.tsx        # React error boundary with fire-themed fallback (Sprint 6)
│   ├── ResumeUpload.tsx         # Upload/paste form (toasts, validation, timeout — Sprint 6)
│   ├── RoastResults.tsx         # Free tier results + payment buttons (Sprint 4)
│   ├── RoastResultsFull.tsx     # Paid tier results display (Sprint 3)
│   ├── TierBadge.tsx            # Free/Full Roast tier badge (Sprint 3)
│   └── SharedRoastView.tsx      # Client wrapper for shared results (Sprint 1)
├── generated/prisma/            # Prisma generated client (Sprint 2)
└── lib/
    ├── __tests__/
    │   ├── share.test.ts        # Unit tests for share encoding/decoding
    │   ├── roast-db.test.ts     # Unit tests for nanoid, hash, permalink (Sprint 2)
    │   ├── tier.test.ts         # Unit tests for tier logic (Sprint 3)
    │   ├── stripe.test.ts       # Unit tests for Stripe env validation (Sprint 4)
    │   ├── checkout.test.ts     # Unit tests for checkout validation (Sprint 4)
    │   ├── credits.test.ts      # Unit tests for credit redemption (Sprint 4)
    │   ├── webhook.test.ts      # Unit tests for webhook logic (Sprint 4)
    │   ├── email.test.ts        # Unit tests for email validation (Sprint 5)
    │   └── file-validation.test.ts # Unit tests for file validation (Sprint 6)
    ├── openrouter.ts            # OpenRouter client config
    ├── prisma.ts                # Prisma client singleton (Sprint 2)
    ├── prompt.ts                # Free/paid roast prompts
    ├── roast-ai.ts              # Shared AI call helper (Sprint 4)
    ├── score.ts                 # Score label utility
    ├── share.ts                 # Share URL encode/decode + buildShareUrlById
    ├── email.ts                 # Email validation utility (Sprint 5)
    ├── file-validation.ts       # File validation + size formatting (Sprint 6)
    ├── stripe.ts                # Stripe client singleton (Sprint 4)
    ├── types.ts                 # TypeScript interfaces
    └── utils.ts                 # Utility functions
prisma/
└── schema.prisma                # Prisma schema with Roast + Credit models
```
