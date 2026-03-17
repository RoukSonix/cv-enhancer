# Project Status

**Last updated:** 2026-03-17 (Sprint 12 — Bugfix)

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
| Admin email export | Working | GET `/api/admin/emails` (JSON + CSV, ADMIN_TOKEN auth — Sprint 9) |
| Public stats endpoint | Working | GET `/api/stats` — cached 60s, real roast count + ratings (Sprint 9) |
| Rating system | Working | POST `/api/roast/[id]/rate` — thumbs up/down (Sprint 9) |
| Admin stats dashboard | Working | GET `/api/admin/stats` + `/admin` page, ADMIN_TOKEN protected (Sprint 9) |
| Social proof (real data) | Working | SocialProof component fetches live stats on landing page (Sprint 9) |
| Rating widget | Working | RatingWidget component on both free and paid results (Sprint 9) |
| Toast error notifications | Working | All errors shown via sonner toasts (Sprint 6) |
| File validation (client) | Working | Rejects non-PDF and >5MB with toast (Sprint 6) |
| File validation (server) | Working | 413 response for >5MB uploads (Sprint 6) |
| File info display | Working | Shows file name + size after upload (Sprint 6) |
| API timeout + retry | Working | 60s AbortController timeout, retry UI (Sprint 6, fixed Sprint 12) |
| Error boundary | Working | Class component wrapping layout children (Sprint 6) |
| Loading skeleton | Working | Pulsing skeleton for `/roast/[id]` page (Sprint 6) |
| Mobile responsiveness | Working | Responsive padding, text sizing, button stacking (Sprint 6) |
| PDF dual-parser fallback | Working | pdf-parse → pdfjs-dist fallback for robust extraction (Sprint 8) |
| PDF text preview | Working | Collapsible extracted text preview before roasting (Sprint 8) |
| PDF quality warning | Working | Amber warning when extracted text < 50 chars (Sprint 8) |
| Preview endpoint | Working | POST /api/roast/preview — lightweight text extraction (Sprint 8) |
| PDF error classification | Working | Encrypted, image-only, corrupted PDFs get descriptive errors (Sprint 8) |
| OG images for social sharing | Working | Dynamic OG image generation via @vercel/og (Sprint 7) |
| Share buttons (Twitter/X) | Working | Twitter intent URL with pre-filled score text (Sprint 7) |
| Share buttons (LinkedIn) | Working | LinkedIn share URL with OG unfurl (Sprint 7) |
| Share buttons (Copy Link) | Working | Clipboard copy with toast confirmation (Sprint 7) |
| OG image API (permalink) | Working | `GET /api/og/[id]` — DB lookup, PNG generation (Sprint 7) |
| OG image API (encoded) | Working | `GET /api/og?r=<encoded>` — lz-string decode, PNG generation (Sprint 7) |
| metadataBase | Working | Root layout metadataBase for absolute OG URLs (Sprint 7) |

| Template Pack sales page | Working | `/templates` page with 5 template cards, Stripe Checkout ($29), ZIP download (Sprint 11) |
| Template checkout | Working | `POST /api/checkout/templates` — separate checkout for template purchases (Sprint 11) |
| Template webhook | Working | Stripe webhook handles `purchaseType: "templates"` metadata, creates TemplatePurchase (Sprint 11) |
| Template download | Working | `GET /api/templates/download?session_id=` — ZIP of 5 DOCX templates, session-verified (Sprint 11) |
| Template success page | Working | `/templates/success` with payment polling and download button (Sprint 11) |
| Template cross-sell | Working | "Resume Template Pack" buttons in RoastResults/RoastResultsFull link to `/templates` (Sprint 11) |
| Auth (Google + Magic Link) | Working | Auth.js v5 with Google OAuth + Resend magic link, JWT sessions, isAdmin role (Sprint 10) |
| Sign-in page | Working | Custom branded `/auth/signin` with Google + email options (Sprint 10) |
| User dashboard | Working | `/dashboard` showing roast history for signed-in users (Sprint 10) |
| Header with auth | Working | Sticky header with logo, sign in/out, user dropdown (Sprint 10) |
| Retroactive roast linking | Working | Existing roasts linked to user by email on first sign-in (Sprint 10) |
| Session-based admin auth | Working | Admin page uses isAdmin from JWT session (Sprint 10) |
| Dual admin API auth | Working | Admin APIs accept session isAdmin OR ADMIN_TOKEN; auth() failure falls through to token (Sprint 10, fixed Sprint 12) |
| Email normalization | Working | Emails lowercased on storage and linking (Sprint 10) |
| Health endpoint | Working | GET /api/health returns { status, timestamp } for liveness probes (Sprint 12 bugfix) |

| Rewrite sales page | Working | `/rewrite` page with pricing tiers, booking form, FAQ (Sprint 12) |
| Rewrite checkout | Working | `POST /api/checkout/rewrite` — FormData, PDF upload, order-before-checkout pattern (Sprint 12) |
| Rewrite webhook | Working | Stripe webhook handles `purchaseType: "rewrite"` metadata, updates order status (Sprint 12) |
| Rewrite success page | Working | `/rewrite/success` with payment polling and order confirmation (Sprint 12) |
| Rewrite order status API | Working | `GET /api/rewrite/status?session_id=` — customer order lookup (Sprint 12) |
| Admin orders page | Working | `/admin/orders` with order table, status dropdowns, expandable details (Sprint 12) |
| Admin orders API | Working | `GET /api/admin/orders` + `PATCH /api/admin/orders/[id]` — dual auth (Sprint 12) |
| Admin order notification | Working | Email notification via Resend on new paid orders (Sprint 12) |
| Rewrite cross-sell | Working | "Professional Rewrite" buttons in RoastResults/RoastResultsFull link to `/rewrite` (Sprint 12) |
| Header navigation | Working | Templates + Rewrite nav links in header (Sprint 12) |

### Not Implemented (Stubs / Missing)

| Feature | Status | Priority |
|---------|--------|----------|
| Deploy (Vercel) | Not started | Medium |
| Domain + DNS | Not started | Medium |

### Implemented (Sprint 12)

- Prisma schema: `RewriteOrder` model with nullable `userId` FK, nullable unique `stripeSessionId`, status progression tracking
- `src/lib/stripe.ts`: Added `getRewritePriceId()` lazy-loaded function (avoids breaking existing tests with module-level `requireEnv`)
- `src/lib/rewrite-email.ts`: Admin notification via Resend on new paid orders (graceful no-op if env vars missing)
- `POST /api/checkout/rewrite`: FormData checkout route with PDF upload, order-before-checkout pattern (avoids Stripe 500-char metadata limit)
- `POST /api/webhooks/stripe`: Extended with rewrite purchase branch between templates and roastId guard (idempotent, fire-and-forget admin notification)
- `GET /api/rewrite/status`: Customer order status lookup by `session_id`
- `GET /api/admin/orders`: Admin order list endpoint (dual auth)
- `PATCH /api/admin/orders/[id]`: Admin status update endpoint with deliveredAt auto-set
- `src/components/RewriteBookingForm.tsx`: Booking form with PDF drag-drop, tier selection, email pre-fill, notes
- `src/app/rewrite/page.tsx`: Sales page with hero, how-it-works, pricing tiers, booking form, FAQ
- `src/app/rewrite/success/page.tsx`: Order confirmation with payment polling, turnaround info, cross-sell
- `src/app/admin/orders/page.tsx`: Admin order management with status dropdowns, expandable details, refresh
- `src/components/RoastResults.tsx`: Cross-sell button now links to `/rewrite` (was "Coming soon!" toast)
- `src/components/RoastResultsFull.tsx`: Same cross-sell update, removed unused `toast` import
- `src/components/Header.tsx`: Added Templates + Rewrite nav links with PenTool icon
- `.env.example`: Added `STRIPE_PRICE_REWRITE_BASIC`, `STRIPE_PRICE_REWRITE_PREMIUM`, `ADMIN_EMAIL`
- Unit tests: 15 tests in `rewrite.test.ts` (purchase detection, checkout validation, webhook processing, admin status updates, email notification, lazy price IDs)

### Implemented (Sprint 11)

- Prisma schema: `TemplatePurchase` model with nullable `userId` FK, `stripeSessionId` unique, download count tracking
- `data/templates/`: 5 DOCX resume template stubs (modern-minimal, corporate, creative-bold, tech-developer, ats-optimized) — stored outside `public/` for security
- `scripts/generate-templates.ts`: DOCX generation script using `docx` npm package
- `src/lib/stripe.ts`: Added `STRIPE_PRICE_TEMPLATES` env var export
- `POST /api/checkout/templates`: Separate checkout route for template purchases (CSRF protection, optional auth session)
- `POST /api/webhooks/stripe`: Extended with template purchase branch BEFORE roastId guard (metadata-based detection, idempotent)
- `GET /api/templates/download`: ZIP download endpoint with session_id verification, download count tracking
- `src/app/templates/page.tsx`: Sales page with 5 template cards, purchase CTA, FAQ section
- `src/app/templates/success/page.tsx`: Success page with payment polling and download button, cross-sell to roast
- `src/components/RoastResults.tsx`: Cross-sell button now links to `/templates` (was "Coming soon!" toast)
- `src/components/RoastResultsFull.tsx`: Same cross-sell update + added `useRouter` import
- Dependencies: `jszip` (prod), `docx` (dev)
- Unit tests: 15 tests in `templates.test.ts` (purchase detection, webhook processing, download auth, count tracking)

### Implemented (Sprint 10)

- Auth.js v5 (`next-auth@beta`) with JWT session strategy and `@auth/prisma-adapter`
- Prisma schema: `User`, `Account`, `VerificationToken` models; nullable `userId` FK on `Roast` with index
- `src/lib/auth.ts`: Auth.js config with Google + Resend providers, JWT/session callbacks, retroactive roast linking via signIn callback
- `src/lib/auth-types.ts`: TypeScript module augmentation for `Session.user.isAdmin` and `JWT.userId`/`JWT.isAdmin`
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js route handler
- `src/components/Header.tsx`: Sticky header with logo, sign in/out button, user avatar dropdown (My Roasts, Admin if isAdmin, Sign Out)
- `src/app/layout.tsx`: Wrapped with `<SessionProvider>` and `<Header />`
- `src/app/auth/signin/page.tsx`: Custom sign-in page with Google button, email magic link form, "Continue without signing in" link
- `src/app/dashboard/page.tsx`: Server component showing user's roast history (score, date, tier badge, summary preview)
- `src/app/api/roast/route.ts`: Attaches `userId` from session if signed in; normalizes email to lowercase
- `src/app/admin/page.tsx`: Uses `useSession()` + `isAdmin` check instead of `?token=` query param
- `src/app/api/admin/stats/route.ts` + `emails/route.ts`: Dual auth via `isAdminAuthorized()` (session isAdmin OR ADMIN_TOKEN)
- `isAdminAuthorized()` helper in `src/lib/auth.ts`: shared admin auth check for API routes
- `.env.example`: Added AUTH_URL, AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, ADMIN_TOKEN
- Unit tests: JWT callback, session callback, signIn callback linking, admin auth helper (8 tests in `auth.test.ts`)
- Bootstrap admin note: After first sign-in, manually set `isAdmin = true` via SQL: `UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@example.com';`

### Implemented (Sprint 9)

- Prisma schema: `rating Int?` field on Roast model (1 = thumbs up, -1 = thumbs down, null = unrated)
- `src/lib/stats-cache.ts`: In-memory cache with 60s TTL, `getPublicStats()` and `getAdminStats()` helpers
- `GET /api/stats`: Public endpoint returning totalRoasts, avgRating (positiveCount/totalCount ratio), positiveRatingCount, totalRatings
- `POST /api/roast/[id]/rate`: Rating submission endpoint (validates 1/-1, upserts, invalidates cache)
- `GET /api/admin/stats`: Admin stats endpoint (ADMIN_TOKEN protected via Bearer header or query param)
- `GET /api/admin/emails`: Retrofitted ADMIN_TOKEN auth (was previously unprotected PII)
- `src/components/SocialProof.tsx`: Client component fetching `/api/stats`, shows real roast count + positive rating %, falls back to static text
- `src/components/RatingWidget.tsx`: Thumbs up/down widget integrated into RoastResults and RoastResultsFull (between score card and top issues)
- `src/app/admin/page.tsx`: Admin dashboard with stat cards (total/free/paid roasts, conversion, revenue, avg score/rating, today/week/month)
- `src/app/page.tsx`: Replaced static social proof section with `<SocialProof />` component
- Unit tests: stats cache (5 tests), rating validation + revenue calc + auth (7 tests)

### Implemented (Sprint 8)

- `pdfjs-dist` dependency for pdf.js fallback extraction (server-side only, legacy build)
- `pdf-lib` + `tsx` dev dependencies for test fixture generation
- `src/lib/pdf-fallback.ts`: Dual-parser extraction (pdf-parse first, pdfjs-dist fallback), error classification (encrypted/image-only/corrupted)
- `PdfExtractionError` class with error codes for descriptive user-facing messages
- `POST /api/roast/preview` endpoint: lightweight text extraction (no AI, no DB), returns first 500 chars + char count + parser method + optional warning
- `src/components/ExtractedTextPreview.tsx`: Collapsible preview with character count badge, amber warning for low text, "Paste instead" link
- `ResumeUpload.tsx` updated: auto-fetches preview on file upload, shows loading spinner, preview silently fails (no toast on error)
- `POST /api/roast` route updated: uses dual-parser extraction, improved error messages for empty/short text, catches `PdfExtractionError` with 400 status
- `scripts/generate-test-pdfs.ts`: Generates 10 test fixtures programmatically (simple, multi-column, multi-page, image-heavy, minimal, encrypted, image-only, large >5MB, corrupted, wrong type)
- `e2e/fixtures/`: Generated test PDFs for E2E testing
- Package.json: `generate-fixtures` script, E2E script chains fixture generation
- Unit tests: 10 tests for PDF extraction + fallback logic (`pdf-extraction.test.ts`)
- E2E tests: 14 tests for PDF upload flows (`pdf-upload.spec.ts`)
- `.gitignore`: Added `e2e/fixtures/large-5mb.pdf` (generated on-demand)

### Implemented (Sprint 7)

- `@vercel/og` dependency for OG image generation (Satori + Resvg WASM, works in Docker)
- Inter font files bundled in `public/fonts/` (Inter-Bold.ttf, Inter-Regular.ttf)
- `metadataBase` added to root layout using `NEXT_PUBLIC_BASE_URL` env var
- `NEXT_PUBLIC_BASE_URL` added to `.env.example`
- `src/lib/og-utils.ts`: `scoreColor()`, `scoreColorSecondary()`, `truncateSummary()`, `buildTwitterShareUrl()`, `buildLinkedInShareUrl()`
- `GET /api/og/[id]/route.tsx`: OG image for DB-backed roasts (1200x630 PNG, score circle, label badge, summary)
- `GET /api/og/route.tsx`: OG image for lz-string encoded share URLs
- Fallback OG image for invalid/missing roasts (branded, returns 200)
- Cache-Control headers: `max-age=86400, s-maxage=604800, stale-while-revalidate=86400`
- `og:image` + `twitter:card: summary_large_image` in `generateMetadata` for `/roast/[id]` and `/roast?r=`
- `src/components/ShareButtons.tsx`: Share on X, Share on LinkedIn, Copy Link buttons
- ShareButtons integrated into `SharedRoastView`, `RoastResults`, `RoastResultsFull`
- Unit tests for og-utils (score colors, truncation, share URLs — 14 tests)
- E2E tests for OG image routes, meta tags, and share buttons (9 tests)

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
- **OG Images:** @vercel/og (Satori + Resvg WASM)
- **PDF Parsing:** pdf-parse + pdfjs-dist (dual-parser fallback)
- **Payments:** Stripe (Checkout Sessions + Webhooks)
- **Auth:** Auth.js v5 (next-auth@beta) with Google OAuth + Resend magic link
- **Database:** PostgreSQL 17 (Alpine) via Prisma 7
- **Runtime:** Node.js 22 (Alpine Docker)
- **Container:** Docker Compose

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── emails/route.ts  # GET: email export endpoint (dual auth — Sprint 10)
│   │   │   ├── stats/route.ts   # GET: admin dashboard stats (dual auth — Sprint 10)
│   │   │   └── orders/
│   │   │       ├── route.ts     # GET: list rewrite orders (dual auth — Sprint 12)
│   │   │       └── [id]/route.ts # PATCH: update order status (dual auth — Sprint 12)
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts # Auth.js route handler (Sprint 10)
│   │   ├── checkout/
│   │   │   ├── route.ts         # POST: create Stripe Checkout session (Sprint 4)
│   │   │   ├── credits/route.ts # GET: check remaining bundle credits (Sprint 4)
│   │   │   ├── redeem/route.ts  # POST: redeem bundle credit (Sprint 4)
│   │   │   ├── templates/route.ts # POST: template pack checkout session (Sprint 11)
│   │   │   └── rewrite/route.ts # POST: rewrite service checkout session (Sprint 12)
│   │   ├── roast/
│   │   │   ├── route.ts         # POST: PDF/text -> AI roast + DB save (dual-parser — Sprint 8)
│   │   │   ├── preview/
│   │   │   │   └── route.ts     # POST: PDF text extraction preview (Sprint 8)
│   │   │   └── [id]/
│   │   │       ├── route.ts     # GET: fetch saved roast by ID (Sprint 2)
│   │   │       ├── upgrade/route.ts # POST: retry AI for stuck paid roasts (Sprint 4)
│   │   │       └── rate/route.ts  # POST: submit rating 1/-1 (Sprint 9)
│   │   ├── health/
│   │   │   └── route.ts         # GET: health check for liveness probes (Sprint 12 bugfix)
│   │   ├── stats/
│   │   │   └── route.ts         # GET: public stats with 60s cache (Sprint 9)
│   │   ├── og/
│   │   │   ├── route.tsx        # GET: OG image for encoded share URLs (Sprint 7)
│   │   │   └── [id]/route.tsx   # GET: OG image for DB roasts (Sprint 7)
│   │   ├── rewrite/
│   │   │   └── status/route.ts  # GET: customer order status by session_id (Sprint 12)
│   │   ├── templates/
│   │   │   └── download/route.ts # GET: template ZIP download with session verification (Sprint 11)
│   │   └── webhooks/stripe/
│   │       └── route.ts         # POST: Stripe webhook handler (Sprint 4, extended Sprint 11, Sprint 12)
│   ├── admin/
│   │   ├── page.tsx             # Admin dashboard with session-based isAdmin check (Sprint 10)
│   │   └── orders/page.tsx      # Admin rewrite order management (Sprint 12)
│   ├── auth/
│   │   └── signin/page.tsx      # Custom sign-in page (Google + magic link — Sprint 10)
│   ├── dashboard/
│   │   └── page.tsx             # User roast history page (Sprint 10)
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
│   ├── rewrite/
│   │   ├── page.tsx             # Rewrite service sales page (Sprint 12)
│   │   └── success/page.tsx     # Rewrite order confirmation page (Sprint 12)
│   ├── templates/
│   │   ├── page.tsx             # Template pack sales page (Sprint 11)
│   │   └── success/page.tsx     # Post-purchase success + download page (Sprint 11)
│   ├── layout.tsx               # Root layout (SessionProvider, Header, ErrorBoundary — Sprint 10)
│   ├── page.tsx                 # Main page (landing + results)
│   └── globals.css              # Global styles, fire theme
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── AnimatedScore.tsx        # Animated score ring
│   ├── FireParticles.tsx        # Background fire particles
│   ├── LoadingRoast.tsx         # Loading state with jokes
│   ├── ErrorBoundary.tsx        # React error boundary with fire-themed fallback (Sprint 6)
│   ├── Header.tsx               # Sticky header with auth controls + nav links (Sprint 10, Sprint 12)
│   ├── RewriteBookingForm.tsx   # Rewrite booking form with PDF upload + tier select (Sprint 12)
│   ├── ExtractedTextPreview.tsx  # Collapsible PDF text preview with quality warning (Sprint 8)
│   ├── ResumeUpload.tsx         # Upload/paste form (toasts, validation, timeout, preview — Sprint 8)
│   ├── RoastResults.tsx         # Free tier results + payment buttons (Sprint 4)
│   ├── RoastResultsFull.tsx     # Paid tier results display (Sprint 3)
│   ├── TierBadge.tsx            # Free/Full Roast tier badge (Sprint 3)
│   ├── ShareButtons.tsx         # Twitter/X, LinkedIn, Copy Link share buttons (Sprint 7)
│   ├── SocialProof.tsx          # Real stats on landing page (Sprint 9)
│   ├── RatingWidget.tsx         # Thumbs up/down rating widget (Sprint 9)
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
    │   ├── file-validation.test.ts # Unit tests for file validation (Sprint 6)
    │   ├── og.test.ts           # Unit tests for OG image helpers (Sprint 7)
    │   ├── pdf-extraction.test.ts # Unit tests for PDF extraction + fallback (Sprint 8)
    │   ├── stats.test.ts          # Unit tests for stats cache (Sprint 9)
    │   ├── rating.test.ts         # Unit tests for rating validation + auth (Sprint 9)
    │   ├── auth.test.ts           # Unit tests for auth callbacks + admin helper (Sprint 10)
    │   ├── templates.test.ts      # Unit tests for template purchase logic (Sprint 11)
    │   └── rewrite.test.ts        # Unit tests for rewrite service logic (Sprint 12)
    ├── auth.ts                  # Auth.js v5 config + isAdminAuthorized helper (Sprint 10)
    ├── auth-types.ts            # Auth type augmentation for Session + JWT (Sprint 10)
    ├── openrouter.ts            # OpenRouter client config
    ├── prisma.ts                # Prisma client singleton (Sprint 2)
    ├── prompt.ts                # Free/paid roast prompts
    ├── roast-ai.ts              # Shared AI call helper (Sprint 4)
    ├── score.ts                 # Score label utility
    ├── share.ts                 # Share URL encode/decode + buildShareUrlById
    ├── email.ts                 # Email validation utility (Sprint 5)
    ├── file-validation.ts       # File validation + size formatting (Sprint 6)
    ├── stats-cache.ts            # In-memory stats cache with 60s TTL (Sprint 9)
    ├── pdf-fallback.ts          # Dual-parser PDF extraction with error classification (Sprint 8)
    ├── og-utils.ts              # OG image helpers: score colors, truncation, share URLs (Sprint 7)
    ├── rewrite-email.ts          # Admin notification for rewrite orders via Resend (Sprint 12)
    ├── stripe.ts                # Stripe client singleton + lazy rewrite price IDs (Sprint 4, Sprint 12)
    ├── types.ts                 # TypeScript interfaces
    └── utils.ts                 # Utility functions
prisma/
└── schema.prisma                # Prisma schema with User, Account, VerificationToken, Roast, Credit, TemplatePurchase, RewriteOrder models
```
