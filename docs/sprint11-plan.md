# Sprint 11: Template Pack Sales Page — Implementation Plan

**Created:** 2026-03-14
**Goal:** Sell resume template packs ($29 one-time) as an additional revenue stream.

---

## Overview

Add a `/templates` page showcasing 5 resume template styles. Users purchase a template pack via Stripe Checkout and receive download links on a success page. Cross-sell from roast results. Track purchases in DB with optional user account linking.

---

## Task Breakdown

### Task 1: Prisma Schema — TemplatePurchase Model

**File:** `prisma/schema.prisma`

Add a new `TemplatePurchase` model:

```prisma
model TemplatePurchase {
  id              String    @id @default(cuid())
  email           String                    // buyer's email (from Stripe session)
  stripeSessionId String    @unique         // Stripe Checkout session ID (idempotency)
  paidAt          DateTime  @default(now()) // when payment was confirmed
  downloadCount   Int       @default(0)     // track how many times downloaded
  lastDownloadAt  DateTime?                 // last download timestamp

  // Link to user account if signed in
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])

  @@index([email])
  @@index([userId])
}
```

Also add `templatePurchases TemplatePurchase[]` to the `User` model's relations.

Run `prisma generate` and `prisma db push` to apply.

**Why cuid() instead of nanoid:** Template purchases don't need short URLs. cuid() is simpler (no import needed).

---

### Task 2: Stripe Product + Environment Variables

**File:** `src/lib/stripe.ts`, `.env.example`

1. Create a new Stripe Product "Resume Template Pack" with a $29.00 one-time Price in the Stripe dashboard (or document that the user needs to).
2. Add `STRIPE_PRICE_TEMPLATES` env var.
3. Export it from `stripe.ts`:

```ts
export const STRIPE_PRICE_TEMPLATES = requireEnv("STRIPE_PRICE_TEMPLATES");
```

4. Add to `.env.example`:

```
STRIPE_PRICE_TEMPLATES=price_xxx  # Stripe Price ID for template pack ($29)
```

---

### Task 3: Template DOCX Stubs

**Directory:** `data/templates/` (NOT `public/` — see security note)

**SECURITY FIX:** Files in `public/` are served statically by Next.js, meaning anyone could download templates at `/templates/modern-minimal.docx` without paying. Store templates in `data/templates/` instead — the download API reads from the filesystem, so this works identically while preventing unauthenticated access.

Create 5 minimal but real DOCX files using a build script (`scripts/generate-templates.ts`). Each template should be a valid DOCX with:
- Template name as heading
- Placeholder sections (Contact Info, Summary, Experience, Education, Skills)
- Brief formatting notes specific to the template style

Files:
- `data/templates/modern-minimal.docx`
- `data/templates/corporate.docx`
- `data/templates/creative-bold.docx`
- `data/templates/tech-developer.docx`
- `data/templates/ats-optimized.docx`

Use `docx` npm package (add as devDependency) in a generation script similar to how `scripts/generate-test-pdfs.ts` works. Run once to generate, commit the output files.

Alternative (simpler): Create the DOCX files manually or with a simple Node script using raw XML (a DOCX is just a ZIP of XML files). Given this is MVP, even very simple files are fine.

**Decision: Use `docx` npm package** — it produces proper DOCX files with minimal code.

---

### Task 4: Template Checkout API

**File:** `src/app/api/checkout/templates/route.ts` (new)

Create a **separate** checkout route for templates (don't overload the existing `/api/checkout` which is roast-specific):

```ts
POST /api/checkout/templates
Body: { email?: string }
```

Logic:
1. CSRF check (same as existing checkout)
2. Get user session (optional — `auth()` from Auth.js)
3. Create Stripe Checkout session:
   - `mode: "payment"`
   - `line_items: [{ price: STRIPE_PRICE_TEMPLATES, quantity: 1 }]`
   - `metadata: { purchaseType: "templates", userId: session?.user?.id ?? "" }`
   - `customer_email: session?.user?.email ?? body.email` (pre-fill email in Stripe)
   - `success_url: /templates/success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: /templates`
4. Return `{ url: session.url }`

**Why separate route:** The existing `/api/checkout` is tightly coupled to roast IDs, bundle credits, and roast-specific validation. A separate route is cleaner and avoids coupling.

---

### Task 5: Extend Stripe Webhook for Template Purchases

**File:** `src/app/api/webhooks/stripe/route.ts`

Extend the existing webhook handler to detect template purchases via metadata.

**IMPORTANT:** The template branch must go **BEFORE** the existing `if (!roastId || !priceType)` guard (line 33 in current code), not after it. Template purchases won't have `roastId` or `priceType` in metadata, so the early return would silently drop them.

```ts
// BEFORE the existing roastId/priceType guard — insert right after line 31:
if (session.metadata?.purchaseType === "templates") {
  // Idempotency: check if TemplatePurchase already exists for this session
  const existing = await prisma.templatePurchase.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existing) return NextResponse.json({ received: true });

  // Create TemplatePurchase record
  await prisma.templatePurchase.create({
    data: {
      email: session.customer_email ?? session.customer_details?.email ?? "",
      stripeSessionId: session.id,
      userId: session.metadata.userId || null,
    },
  });
  return NextResponse.json({ received: true });
}
```

**Why extend instead of new webhook:** Stripe sends all `checkout.session.completed` events to one endpoint. Adding a second webhook URL adds complexity. A simple metadata-based branch is cleaner.

---

### Task 6: Template Download API

**File:** `src/app/api/templates/download/route.ts` (new)

```ts
GET /api/templates/download?session_id=cs_xxx
```

Logic:
1. Verify the Stripe session ID is valid by looking up `TemplatePurchase` in DB
2. If not found, return 403
3. Increment `downloadCount`, update `lastDownloadAt`
4. Create a ZIP of all 5 template DOCX files (use `archiver` or `jszip`)
5. Return the ZIP as a streaming response with `Content-Disposition: attachment; filename="resume-templates.zip"`

Alternative approach: Serve individual download links for each template instead of a ZIP. **Decision: ZIP** — simpler UX, one click downloads everything.

**Package:** Add `jszip` as a dependency (lightweight, works in Edge/Node).

---

### Task 7: `/templates` Page

**File:** `src/app/templates/page.tsx` (new)

Server component with:

1. **Hero section** — "Resume Template Pack" heading, "$29 — All 5 Templates" subtext
2. **Template grid** — 5 cards in a responsive grid (1 col mobile, 2-3 col desktop)
3. Each card:
   - Template name
   - Description (2-3 sentences about the style/use case)
   - Visual placeholder (styled div with template-appropriate colors/patterns — no actual images needed for MVP)
   - "Best for: [role types]" tagline
4. **Purchase CTA** — Single "Buy Template Pack — $29" button that calls `POST /api/checkout/templates`
5. **FAQ section** — 3-4 common questions (What formats? Editable? Refund policy?)

Template descriptions:
| Template | Description | Best For |
|----------|-------------|----------|
| Modern Minimal | Clean single-column layout with subtle accents. Generous whitespace. | Design, Marketing, Startups |
| Corporate | Traditional two-column format. Conservative styling. | Finance, Consulting, Legal |
| Creative Bold | Eye-catching color blocks and visual hierarchy. | Creative roles, Portfolios |
| Tech/Developer | Monospace accents, skills matrix, project showcase sections. | Software Engineers, DevOps, Data |
| ATS-Optimized | Maximum ATS compatibility. Simple formatting, standard headers. | Any role — highest pass rate |

The page should be a client component (needs onClick for checkout button).

---

### Task 8: `/templates/success` Page

**File:** `src/app/templates/success/page.tsx` (new)

1. Parse `session_id` from URL query params
2. Show success message: "Your templates are ready!"
3. Poll `GET /api/templates/download?session_id=xxx` availability (or just show the download button — webhook is usually faster than redirect)
4. "Download All Templates" button → triggers the download API
5. Individual template download links (optional for MVP — skip this, just do the ZIP)
6. Cross-sell: "Now get your resume roasted!" link to `/`

**Implementation:** Client component with `useSearchParams()`. On mount, verify the session_id exists in DB (quick fetch to a verification endpoint, or just let the download endpoint handle auth).

Simpler approach: Just show a download button. If the webhook hasn't fired yet, the download API returns 403, and the UI shows "Processing your payment..." with a retry after 2s. Same polling pattern used in `/checkout/success/SuccessPoller.tsx`.

---

### Task 9: Cross-sell from Roast Results

**Files:**
- `src/components/RoastResults.tsx` (line ~312-328)
- `src/components/RoastResultsFull.tsx` (line ~195-217)

Replace the "Coming soon!" toast on the "Resume Template Pack — $29" button with a link to `/templates`:

```tsx
// Before:
onClick={() => toast("Coming soon!", { description: "..." })}

// After:
onClick={() => router.push("/templates")}
```

Import `useRouter` from `next/navigation` (already imported in `RoastResults.tsx`, needs adding to `RoastResultsFull.tsx`).

---

### Task 10: Unit Tests

**File:** `src/lib/__tests__/templates.test.ts` (new)

Tests:
1. Template checkout validation (email format if provided)
2. TemplatePurchase DB creation (mock Prisma)
3. Download auth check (valid session_id returns 200, invalid returns 403)
4. Download count increment logic
5. Webhook template purchase branch (metadata detection, idempotency)

Target: 8-10 tests, following existing patterns (vitest, mocked Prisma).

---

### Task 11: E2E Tests

**File:** `e2e/templates.spec.ts` (new)

Tests:
1. `/templates` page loads with all 5 template cards
2. Buy button initiates checkout (mock or intercept Stripe redirect)
3. Cross-sell button on roast results links to `/templates`
4. Success page shows download button (with mocked session_id)

Target: 4-6 tests, following existing Playwright patterns.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Edit | Add `TemplatePurchase` model, add relation to `User` |
| `src/lib/stripe.ts` | Edit | Add `STRIPE_PRICE_TEMPLATES` export |
| `.env.example` | Edit | Add `STRIPE_PRICE_TEMPLATES` |
| `package.json` | Edit | Add `docx` (dev), `jszip` (prod) dependencies |
| `scripts/generate-templates.ts` | New | Script to generate 5 DOCX template stubs |
| `data/templates/*.docx` | New | 5 generated template files |
| `src/app/api/checkout/templates/route.ts` | New | Template checkout session creation |
| `src/app/api/templates/download/route.ts` | New | Template ZIP download endpoint |
| `src/app/api/webhooks/stripe/route.ts` | Edit | Add template purchase branch |
| `src/app/templates/page.tsx` | New | Template pack sales page |
| `src/app/templates/success/page.tsx` | New | Post-purchase success + download page |
| `src/components/RoastResults.tsx` | Edit | Cross-sell button → link to `/templates` |
| `src/components/RoastResultsFull.tsx` | Edit | Cross-sell button → link to `/templates` |
| `src/lib/__tests__/templates.test.ts` | New | Unit tests |
| `e2e/templates.spec.ts` | New | E2E tests |
| `docs/STATUS.md` | Edit | Add Sprint 11 features to status |

---

## Implementation Order

1. **Schema + migration** (Task 1) — foundation, everything depends on this
2. **Stripe env var** (Task 2) — quick, unblocks checkout
3. **Template DOCX stubs** (Task 3) — can run in parallel with Task 2
4. **Checkout API** (Task 4) — depends on Tasks 1-2
5. **Webhook extension** (Task 5) — depends on Task 1
6. **Download API** (Task 6) — depends on Tasks 1, 3
7. **Templates page** (Task 7) — depends on Task 4
8. **Success page** (Task 8) — depends on Tasks 6, 7
9. **Cross-sell wiring** (Task 9) — depends on Task 7
10. **Unit tests** (Task 10) — after Tasks 4-6
11. **E2E tests** (Task 11) — after Tasks 7-9

---

## Architectural Decisions

1. **Separate checkout route** (`/api/checkout/templates`) instead of extending existing `/api/checkout`. Reason: existing route is tightly coupled to roast IDs, bundle credits, and roast validation. Mixing concerns would make both harder to maintain.

2. **Extend existing webhook** rather than creating a second webhook endpoint. Reason: Stripe sends all events to one URL. A metadata-based branch (`purchaseType: "templates"`) is the standard pattern.

3. **ZIP download** instead of individual file links. Reason: simpler UX (one click), and all 5 templates are lightweight DOCX files.

4. **No S3/Vercel Blob** for MVP. Templates are static files in `data/templates/`. The download API reads them from disk and ZIPs on-the-fly. This avoids external service dependencies. Can migrate to S3 later if files get large.

5. **Session-based download auth** via `stripeSessionId` in DB lookup. No signed URLs or time-limited tokens for MVP — the session_id in the URL is the access key. This is secure enough since session IDs are long random strings from Stripe.

6. **No email delivery** for MVP. Downloads are served via the success page. Email delivery can be added in a future sprint if needed.

---

## Dependencies to Add

| Package | Type | Purpose |
|---------|------|---------|
| `docx` | devDependency | Generate DOCX template stubs (build script only) |
| `jszip` | dependency | Create ZIP archive for template download |

---

## Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `STRIPE_PRICE_TEMPLATES` | `price_1Qxxx` | Stripe Price ID for the $29 template pack |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook fires late, download fails | Low | Polling on success page (same pattern as roast checkout) |
| DOCX generation produces invalid files | Medium | Test opening in Word/Google Docs before shipping |
| Large ZIP response in serverless | Low | 5 DOCX files ~50KB total, well within limits |
| Stripe env var missing in dev | Low | `requireEnv()` fails fast with clear error |

---

## Validation: APPROVED

**Validated:** 2026-03-14
**Validator:** Claude (Opus 4.6)

### Checklist

| # | Question | Verdict | Notes |
|---|----------|---------|-------|
| 1 | Separate `/api/checkout/templates` route? | **APPROVED** | Existing checkout is tightly coupled to roastId, priceType, bundleToken. Separate route avoids coupling. |
| 2 | Webhook metadata branching safe? | **FIXED** | Original plan placed template branch after the `!roastId \|\| !priceType` early return (line 33), which would silently drop template events. Fixed: template branch must go BEFORE that guard. |
| 3 | DOCX from `public/` secure? | **FIXED** | `public/` is statically served by Next.js — anyone could download at `/templates/*.docx` without paying. Fixed: moved to `data/templates/` (not publicly served). Download API reads from filesystem. |
| 4 | ZIP download approach appropriate? | **APPROVED** | 5 DOCX files ~50KB total. `jszip` is lightweight. One-click UX is simpler than individual links. |
| 5 | TemplatePurchase integrates with auth? | **APPROVED** | Optional `userId` (nullable FK) matches Roast model pattern. `cuid()` consistent with User/Account/Credit models. Relation addition to User model is standard. |
| 6 | Cross-sell button changes backward compatible? | **APPROVED** | Only onClick handler changes (toast → router.push). Button text, styling, layout unchanged. `useRouter` already imported in RoastResults; plan correctly notes it needs adding to RoastResultsFull. |
| 7 | Existing E2E tests break? | **APPROVED** | `paid-tier.spec.ts:187` checks button visibility (`/Template Pack.*\$29/`) — still passes. No test asserts on the "Coming soon!" toast text. `roast-flow.spec.ts:53` comment references "Coming soon" but doesn't assert on it. |
| 8 | Stripe price env var consistent? | **APPROVED** | `STRIPE_PRICE_TEMPLATES` uses same `requireEnv()` pattern as `STRIPE_PRICE_SINGLE` and `STRIPE_PRICE_BUNDLE`. |

### Issues Fixed in This Review

1. **Webhook ordering (Critical):** Moved template metadata check instruction to BEFORE the `!roastId || !priceType` guard in Task 5.
2. **Template file security:** Changed storage from `public/templates/` to `data/templates/` in Tasks 3 and 6, file summary, and architectural decisions.
