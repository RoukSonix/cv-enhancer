# Sprint 4: Payments (Stripe Integration) — Implementation Plan

**Created:** 2026-03-12
**Branch:** `sprint4/payments`
**Goal:** Accept payments via Stripe for Full Roast ($9.99) and Bundle (3 roasts for $24.99).

---

## 1. Payment Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SINGLE ROAST ($9.99)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User gets free roast → sees "Get Full Roast — $9.99"          │
│       │                                                         │
│       ▼                                                         │
│  POST /api/checkout  { roastId, priceType: "single" }          │
│       │                                                         │
│       ▼                                                         │
│  Create Stripe Checkout Session                                 │
│    - metadata: { roastId, priceType: "single" }                │
│    - success_url: /checkout/success?session_id={SESSION_ID}    │
│    - cancel_url: /checkout/cancel?roast_id={ROAST_ID}          │
│       │                                                         │
│       ▼                                                         │
│  Redirect to Stripe hosted checkout page                        │
│       │                                                         │
│       ▼                                                         │
│  ┌─ Payment succeeds ─────────────────────────────────────┐    │
│  │  Stripe redirects to /checkout/success?session_id=...  │    │
│  │  Webhook fires: checkout.session.completed             │    │
│  │    1. Mark roast as paid in DB                         │    │
│  │    2. Re-run AI with paid-tier prompt                  │    │
│  │    3. Update roast result in DB                        │    │
│  │  Success page polls/verifies, then redirects to        │    │
│  │    /roast/[id] which now shows RoastResultsFull        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Payment cancelled ────────────────────────────────────┐    │
│  │  Stripe redirects to /checkout/cancel?roast_id=...     │    │
│  │  Shows "Payment cancelled" with retry link             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      BUNDLE (3 for $24.99)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User clicks "3 roasts for $24.99"                             │
│       │                                                         │
│       ▼                                                         │
│  POST /api/checkout  { roastId, priceType: "bundle" }          │
│       │                                                         │
│       ▼                                                         │
│  Create Stripe Checkout Session                                 │
│    - metadata: { roastId, priceType: "bundle" }                │
│    - success_url: /checkout/success?session_id={SESSION_ID}    │
│       │                                                         │
│       ▼                                                         │
│  After payment (via webhook):                                   │
│    1. Create 3 Credit records (one used immediately)           │
│    2. Set bundle token cookie on success page                  │
│    3. First credit → upgrade current roast (same as single)    │
│    4. Remaining 2 credits → redeemable via cookie token        │
│       │                                                         │
│       ▼                                                         │
│  On future free roasts, if user has credits (cookie check):    │
│    - Show "Use Credit (2 remaining)" instead of $9.99 button  │
│    - POST /api/checkout/redeem { roastId, bundleToken }        │
│    - Upgrade roast without Stripe (uses existing credit)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Stripe Product/Price Setup

### Stripe Dashboard Configuration (Test Mode)

1. **Create Product: "Full Roast"**
   - Name: `Full Roast`
   - Description: `Complete AI resume critique with 5 sections, rewritten bullets, and full ATS analysis`

2. **Create Price: Single ($9.99)**
   - Product: Full Roast
   - Type: One-time
   - Amount: $9.99 USD
   - Copy the Price ID → `STRIPE_PRICE_SINGLE`

3. **Create Price: Bundle ($24.99)**
   - Product: Full Roast
   - Type: One-time
   - Amount: $24.99 USD
   - Description: `Bundle of 3 Full Roasts`
   - Copy the Price ID → `STRIPE_PRICE_BUNDLE`

4. **Set up Webhook Endpoint**
   - URL: `https://<domain>/api/webhooks/stripe`
   - Events to listen for: `checkout.session.completed`
   - Copy Webhook Signing Secret → `STRIPE_WEBHOOK_SECRET`
   - For local dev: use `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## 3. Environment Variables

Add to `.env.example` and `.env.local`:

```env
# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SINGLE=price_...          # $9.99 one-time
STRIPE_PRICE_BUNDLE=price_...          # $24.99 one-time (3 credits)
```

All 5 variables are required. The app should fail fast at startup if any are missing (validated in the Stripe client module).

---

## 4. Prisma Schema Changes

**File:** `prisma/schema.prisma`

```prisma
model Roast {
  id             String    @id              // nanoid, 12 chars
  resumeText     String                     // original resume text
  resumeHash     String                     // SHA-256 hash for dedup
  tier           String    @default("free") // "free" or "paid"
  result         Json                       // full RoastResult JSON
  overallScore   Int                        // denormalized for queries
  createdAt      DateTime  @default(now())

  // --- Sprint 4: Payment fields ---
  paid           Boolean   @default(false)  // true after successful payment
  stripeSessionId String?  @unique          // Stripe Checkout session ID
  paidAt         DateTime?                  // when payment was confirmed
  creditId       String?                    // links to Credit if upgraded via bundle

  @@index([resumeHash])
  @@index([createdAt])
}

model Credit {
  id              String    @id @default(cuid())
  bundleToken     String                    // shared token for all credits in a bundle
  stripeSessionId String                    // Stripe Checkout session that created this
  roastId         String?                   // null = unused, set when redeemed
  usedAt          DateTime?                 // when the credit was consumed
  createdAt       DateTime  @default(now())

  @@index([bundleToken])
  @@index([stripeSessionId])
}
```

**Migration command:** `npx prisma db push` (dev) or `npx prisma migrate dev --name add-payments` (production)

### Key decisions:
- `paid` is a denormalized boolean for fast checks (avoids joining to Stripe data)
- `stripeSessionId` is unique to prevent double-processing
- `Credit` has a `bundleToken` — a random token stored in the user's cookie to identify their bundle
- Each credit is a separate row; `roastId` is set when consumed

---

## 5. Files to Create

### 5a. `src/lib/stripe.ts` — Stripe client singleton

```
Purpose: Initialize and export the Stripe SDK client
Exports:
  - stripe: Stripe instance (server-side only)
  - STRIPE_PRICE_SINGLE: string
  - STRIPE_PRICE_BUNDLE: string
Validates: All STRIPE_* env vars are present at import time
```

### 5b. `src/app/api/checkout/route.ts` — Create Checkout Session

```
POST /api/checkout

Request body (JSON):
  {
    roastId: string,         // existing roast to upgrade
    priceType: "single" | "bundle"
  }

Validation:
  - roastId must exist in DB
  - roastId must not already be paid
  - priceType must be "single" or "bundle"
  - Origin header must match (CSRF protection)

Logic:
  1. Look up Roast by ID, verify it exists and is not paid
  2. Select price ID based on priceType
  3. If priceType === "bundle": generate bundleToken = nanoid(16)
  4. Create Stripe Checkout Session:
     - mode: "payment"
     - line_items: [{ price: priceId, quantity: 1 }]
     - metadata: { roastId, priceType, bundleToken (if bundle, else omit) }
     - success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
     - cancel_url: `${origin}/checkout/cancel?roast_id=${roastId}`
  5. Return { url: session.url }

Response: { url: string }
Status codes: 200, 400 (validation), 404 (roast not found), 409 (already paid), 500
```

### 5c. `src/app/api/webhooks/stripe/route.ts` — Stripe Webhook Handler

```
POST /api/webhooks/stripe

Headers:
  - stripe-signature: Stripe webhook signature

Logic:
  1. Read raw body as text (NOT JSON — needed for signature verification)
  2. Verify signature using STRIPE_WEBHOOK_SECRET
  3. If event.type === "checkout.session.completed":
     a. Extract metadata: { roastId, priceType }
     b. Idempotency: check if roast already has this stripeSessionId → skip if so
     c. If priceType === "single":
        - Update Roast: paid=true, stripeSessionId, paidAt=now()
        - Fetch resumeText from Roast record
        - Re-run AI with paid-tier prompt (buildRoastPrompt(resumeText, "paid"))
        - Parse response and update Roast: tier="paid", result=newResult, overallScore=newScore
     d. If priceType === "bundle":
        - Generate bundleToken (nanoid(16))
        - Create 3 Credit records with this bundleToken
        - Use first credit immediately:
          * Set credit.roastId = roastId, credit.usedAt = now()
          * Update Roast same as single (paid, tier, re-run AI, etc.)
        - Store bundleToken in session metadata for success page
  4. Return 200 OK (Stripe expects this)

IMPORTANT:
  - Must use `export const runtime = 'nodejs'` (not edge — needs raw body)
  - Must NOT use bodyParser / JSON parsing middleware (raw body needed)
  - Webhook must be idempotent: check stripeSessionId before processing
  - AI re-run can fail — mark as paid regardless, queue retry if AI fails
    (user can still see old free results; a background job or manual retry fixes it)

Response: Always 200 (even on internal error — Stripe retries on non-2xx)
```

### 5d. `src/app/api/checkout/redeem/route.ts` — Redeem Bundle Credit

```
POST /api/checkout/redeem

Request body (JSON):
  {
    roastId: string       // roast to upgrade
  }

Logic:
  1. Read bundleToken from `bundle_token` HttpOnly cookie
  2. Validate roastId exists and is not paid
  3. Find an unused Credit where bundleToken matches and roastId is null
  4. If no cookie or no credits available → 402 Payment Required
  5. In a transaction:
     a. Update Credit: set roastId, usedAt
     b. Update Roast: paid=true, paidAt=now(), creditId=credit.id
     c. Re-run AI with paid prompt
     d. Update Roast result with paid-tier data

Response: { success: true, creditsRemaining: number }
Status codes: 200, 400, 402 (no credits/no cookie), 404, 409 (already paid), 500
```

### 5e. `src/app/api/checkout/credits/route.ts` — Check Bundle Credits

```
GET /api/checkout/credits

Logic:
  1. Read bundleToken from `bundle_token` HttpOnly cookie
  2. If no cookie → return { credits: 0 }
  3. Count unused Credits where bundleToken matches and roastId is null
  4. Return { credits: number }

Response: { credits: number }
Status codes: 200
```

### 5f. `src/app/checkout/success/page.tsx` — Payment Success Page

```
Route: /checkout/success?session_id={CHECKOUT_SESSION_ID}

Logic (server component):
  1. Retrieve Stripe session by session_id (server-side)
  2. Extract roastId and priceType from session metadata
  3. Verify payment_status === "paid"
  4. If bundle: set bundleToken cookie (HttpOnly, Secure, SameSite=Lax, 1 year expiry)
     - bundleToken is read directly from Stripe session metadata (set at checkout creation)
     - This avoids a race condition: Credits are created by the webhook which may not have fired yet
  5. Show brief "Payment successful!" message
  6. Client-side: poll GET /api/roast/[id] until tier === "paid" (webhook may still be processing)
  7. Once ready → redirect to /roast/[id]

UI:
  - Loading spinner with "Processing your Full Roast..."
  - Auto-redirect once paid result is available
  - Fallback: "Taking longer than expected" with manual link after 30s
```

### 5g. `src/app/checkout/cancel/page.tsx` — Payment Cancelled Page

```
Route: /checkout/cancel?roast_id={ROAST_ID}

UI:
  - "Payment cancelled" heading
  - "No worries! Your free roast is still available."
  - Button: "View Free Results" → /roast/[roastId]
  - Button: "Try Again" → triggers checkout flow again
  - No server-side logic needed (simple static-ish page)
```

---

## 6. Files to Modify

### 6a. `src/components/RoastResults.tsx`

**Changes:**
- Replace "Coming soon!" toast on "Get Full Roast — $9.99" button with actual checkout logic
- Add "3 roasts for $24.99" as a secondary button (currently only text, not a button)
- Add bundle credit check: if user has credits (cookie), show "Use Credit" button instead
- Wire buttons to POST `/api/checkout` and redirect to Stripe or call `/api/checkout/redeem`

**New behavior for "Get Full Roast — $9.99" button:**
```
On mount (or via parent):
  1. GET /api/checkout/credits (server reads cookie automatically)
  2. If credits > 0: show "Use Credit (N remaining)" button instead

onClick "Use Credit":
  POST /api/checkout/redeem { roastId } (server reads cookie automatically)
  On success: redirect to /roast/[id] (will show paid results)

onClick "$9.99":
  POST /api/checkout { roastId: result.id, priceType: "single" }
  Redirect to response.url (Stripe Checkout)
```

**New "3 for $24.99" button:**
```
onClick:
  POST /api/checkout { roastId: result.id, priceType: "bundle" }
  Redirect to response.url (Stripe Checkout)
```

### 6b. `src/components/RoastResultsFull.tsx`

**Changes:**
- Remove "Coming soon!" toasts from "Resume Template Pack" and "Professional Rewrite" buttons (keep as-is for now, these are Sprint 12/13)
- No other changes needed — this component already renders correctly for paid tier

### 6c. `src/app/api/roast/route.ts`

**Changes:**
- No changes needed for the main POST flow
- The webhook handles re-running AI separately

### 6d. `src/app/roast/[id]/page.tsx`

**Changes:**
- No changes needed — already renders `SharedRoastView` which switches between free/paid based on `result.tier`
- The webhook updates the `tier` and `result` fields, so next page load shows paid results

### 6e. `prisma/schema.prisma`

**Changes:** Add fields as described in Section 4

### 6f. `.env.example`

**Changes:** Add the 5 Stripe environment variables

### 6g. `docker-compose.yml`

**Changes:** No changes needed — Stripe env vars come from `.env.local` via `env_file`

### 6h. `src/lib/types.ts`

**Changes:** Add `paid` field to `RoastResult` interface:
```ts
export interface RoastResult {
  // ... existing fields ...
  paid?: boolean;  // true after payment confirmed
}
```

### 6i. `package.json`

**Changes:** Add `stripe` dependency:
```
npm install stripe
```

---

## 7. Webhook Handling — Detailed Logic

```
POST /api/webhooks/stripe

1. const body = await req.text()  // raw body for signature
2. const sig = req.headers.get("stripe-signature")
3. const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)

4. if (event.type !== "checkout.session.completed") return Response(200)

5. const session = event.data.object as Stripe.Checkout.Session
6. const { roastId, priceType, bundleToken } = session.metadata

7. // Idempotency check
   const existing = await prisma.roast.findUnique({
     where: { id: roastId },
     select: { stripeSessionId: true }
   })
   if (existing?.stripeSessionId === session.id) return Response(200)

8. // Mark as paid (do this FIRST, before AI call which may be slow/fail)
   await prisma.roast.update({
     where: { id: roastId },
     data: {
       paid: true,
       stripeSessionId: session.id,
       paidAt: new Date(),
     }
   })

9. // Handle bundle credits
   if (priceType === "bundle") {
     // bundleToken was generated at checkout creation and passed via metadata
     await prisma.credit.createMany({
       data: [
         { bundleToken, stripeSessionId: session.id, roastId, usedAt: new Date() },  // 1st credit used now
         { bundleToken, stripeSessionId: session.id },  // unused
         { bundleToken, stripeSessionId: session.id },  // unused
       ]
     })
   }

10. // Re-run AI with paid prompt (use shared helper from src/lib/roast-ai.ts)
    try {
      const roast = await prisma.roast.findUnique({
        where: { id: roastId },
        select: { resumeText: true }
      })
      // Use shared runRoastAI(resumeText, "paid") helper
      // (same logic as POST /api/roast — extracted to avoid duplication)
      const prompt = buildRoastPrompt(roast.resumeText, "paid")
      const completion = await openrouter.chat.completions.create({ ... })
      const parsed = JSON.parse(extractJson(completion))

      const newResult: RoastResult = {
        id: roastId,
        overallScore: parsed.overallScore,
        // ... same mapping as in POST /api/roast ...
        tier: "paid",
        paid: true,
      }

      await prisma.roast.update({
        where: { id: roastId },
        data: {
          tier: "paid",
          result: newResult as Prisma.JsonObject,
          overallScore: newResult.overallScore,
        }
      })
    } catch (aiError) {
      console.error("Failed to re-run AI for paid roast:", aiError)
      // Roast is still marked paid — success page will need to handle
      // showing a "processing" state and retrying
    }

11. return Response(200)
```

### AI Re-run Failure Handling

If the AI call fails during webhook processing:
- The roast is already marked `paid: true` but `tier` remains `"free"`
- The success page detects this state (paid but not yet upgraded)
- Success page shows "Your payment was received! Generating your Full Roast..." with a spinner
- Client polls `GET /api/roast/[id]` every 3 seconds
- Add a `POST /api/roast/[id]/upgrade` endpoint that retries the AI call for paid roasts where tier is still "free"
- Success page calls this retry endpoint if polling doesn't resolve within 10 seconds

---

## 8. Bundle Credits Mechanism

### How it works (no auth required):

1. **Purchase:** User buys bundle → webhook creates 3 `Credit` rows with shared `bundleToken`
2. **First credit:** Used immediately for the current roast (set in webhook)
3. **Cookie:** Success page sets `bundleToken` cookie (read from Credits linked to session)
4. **Future roasts:** Frontend calls `GET /api/checkout/credits` (server reads bundleToken from HttpOnly cookie)
5. **Display:** If credits > 0, show "Use Credit (N remaining)" instead of "$9.99" button
6. **Redeem:** POST `/api/checkout/redeem` with roastId (server reads bundleToken from HttpOnly cookie) → upgrades roast using a credit

### Cookie spec:
- Name: `bundle_token`
- Value: the `bundleToken` string (nanoid(16))
- HttpOnly: true (server reads cookie from request; no client JS access needed — more secure against XSS)
- Secure: true (HTTPS only in production)
- SameSite: Lax
- Max-Age: 31536000 (1 year)
- Path: /

### Edge cases:
- User clears cookies → credits are lost (acceptable for MVP, auth solves this later in Sprint 11)
- Multiple bundles → only latest cookie wins; old credits still exist in DB but unreachable without token
  - Mitigation: append tokens instead of replacing, or use a different cookie per bundle
  - **Decision:** For MVP, one `bundle_token` cookie. If user buys another bundle, generate new token and merge by also checking unused credits from old sessions. Keep it simple.
- User shares bundle token → others can use their credits (acceptable risk for MVP)

---

## 9. CSRF Protection

The `/api/checkout` endpoint must verify the request originates from our site:

```ts
// In POST /api/checkout
const origin = req.headers.get("origin");
const host = req.headers.get("host");
const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
const expectedOrigin = `${protocol}://${host}`;

if (!origin || origin !== expectedOrigin) {
  return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
}
```

This prevents external sites from triggering checkout sessions for arbitrary roasts. The webhook endpoint does NOT need CSRF — it's protected by Stripe signature verification instead.

**Note:** The protocol check uses `NODE_ENV` to support `http://localhost:3000` in dev and `https://` in production.

---

## 10. Success Page Polling Logic

The success page needs to wait for the webhook to finish processing (AI re-run can take 10-30 seconds):

```
/checkout/success?session_id=cs_test_...

1. Server: Fetch Stripe session → get roastId from metadata
2. Server: Check if priceType === "bundle" → set cookie with bundleToken
3. Client: Start polling GET /api/roast/{roastId} every 3s
4. Client: Check if result.tier === "paid"
   - Yes → redirect to /roast/{roastId}
   - No → keep polling
5. Client: After 30s without resolution:
   - Show "Taking longer than expected..."
   - Show "View Results" button (links to /roast/{roastId} — may still show free tier)
   - Paid results will appear on next page load once webhook completes
```

---

## 11. Files Summary

### New Files (9)
| File | Purpose |
|------|---------|
| `src/lib/stripe.ts` | Stripe client singleton + price ID exports |
| `src/lib/roast-ai.ts` | Shared AI call + result parsing (used by POST /api/roast and webhook) |
| `src/app/api/checkout/route.ts` | POST: create Stripe Checkout session |
| `src/app/api/checkout/redeem/route.ts` | POST: redeem bundle credit |
| `src/app/api/checkout/credits/route.ts` | GET: check remaining credits (reads cookie server-side) |
| `src/app/api/webhooks/stripe/route.ts` | POST: handle Stripe webhook events |
| `src/app/api/roast/[id]/upgrade/route.ts` | POST: retry AI re-run for paid roasts stuck on free tier |
| `src/app/checkout/success/page.tsx` | Payment success + polling + redirect |
| `src/app/checkout/cancel/page.tsx` | Payment cancelled + retry CTA |

### Modified Files (6)
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `paid`, `stripeSessionId`, `paidAt`, `creditId` to Roast; add `Credit` model |
| `src/components/RoastResults.tsx` | Wire payment buttons to checkout/redeem flow |
| `src/app/api/roast/route.ts` | Extract AI call logic into `src/lib/roast-ai.ts`, import shared helper |
| `src/lib/types.ts` | Add `paid?: boolean` to `RoastResult` |
| `.env.example` | Add 5 Stripe env vars |
| `package.json` | Add `stripe` dependency |

---

## 12. Test Cases

### Unit Tests (`src/lib/__tests__/stripe.test.ts`)

1. **Stripe client initialization** — validates env vars, throws if missing
2. **Price ID selection** — returns correct price ID for "single" vs "bundle"

### Unit Tests (`src/lib/__tests__/checkout.test.ts`)

3. **Checkout request validation** — rejects missing roastId, invalid priceType
4. **Checkout rejects already-paid roast** — returns 409
5. **Checkout rejects non-existent roast** — returns 404

### Unit Tests (`src/lib/__tests__/webhook.test.ts`)

6. **Webhook signature verification** — rejects invalid signatures
7. **Webhook idempotency** — skips already-processed sessions
8. **Webhook marks roast as paid** — updates DB correctly for single purchase
9. **Webhook creates 3 credits for bundle** — correct bundleToken, first credit used
10. **Webhook handles AI failure gracefully** — roast still marked paid

### Unit Tests (`src/lib/__tests__/credits.test.ts`)

11. **Credit redemption** — decrements available credits, upgrades roast
12. **Credit redemption with no credits** — returns 402
13. **Credit check** — returns correct count of unused credits
14. **Double redemption prevention** — same roast can't use two credits

### E2E Tests (`e2e/checkout.spec.ts`)

15. **Upsell button triggers checkout** — click "Get Full Roast" → redirected to Stripe (mock)
16. **Bundle button triggers checkout** — click "3 for $24.99" → redirected to Stripe (mock)
17. **Success page redirects** — /checkout/success with valid session → redirects to /roast/[id]
18. **Cancel page shows retry** — /checkout/cancel shows correct buttons
19. **Credit button shows when credits exist** — with cookie, shows "Use Credit" instead of price

### Manual Testing Checklist

- [ ] Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Complete single purchase with test card `4242 4242 4242 4242`
- [ ] Verify roast upgrades to paid tier after webhook fires
- [ ] Complete bundle purchase
- [ ] Verify 3 credits created, first one used
- [ ] Verify cookie set on success page
- [ ] Get new free roast → verify "Use Credit" button appears
- [ ] Redeem credit → verify roast upgrades
- [ ] Test declined card → verify cancel page works
- [ ] Test webhook replay → verify idempotency (no duplicate processing)

---

## 13. Implementation Order

1. **Install stripe package** + add env vars to `.env.example`
2. **Prisma schema** — add payment fields + Credit model, run `prisma db push`
3. **`src/lib/stripe.ts`** — client singleton
4. **`POST /api/checkout`** — create Checkout session
5. **`POST /api/webhooks/stripe`** — handle webhook + AI re-run
6. **`/checkout/success`** — success page with polling
7. **`/checkout/cancel`** — cancel page
8. **Wire `RoastResults.tsx`** — connect buttons to checkout flow
9. **Bundle: credit endpoints** — `GET /credits`, `POST /redeem`
10. **Bundle: cookie handling** — set in success page, read in RoastResults
11. **Update types** — `RoastResult.paid`
12. **Write tests** — unit + E2E
13. **Update `docs/STATUS.md`**

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| AI re-run fails after payment | Mark paid first; success page polls; add retry endpoint |
| Duplicate webhook events | Idempotency check on `stripeSessionId` (unique constraint) |
| User pays but webhook delayed | Success page polls for up to 30s, shows fallback |
| Bundle cookie lost | Acceptable for MVP; Sprint 11 (auth) solves permanently |
| CSRF on checkout endpoint | Origin header validation |
| Webhook body parsing | Use `req.text()` not `req.json()` for Stripe signature verification |
| Stripe keys leaked | Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` client-side; only `STRIPE_PUBLISHABLE_KEY` is public (prefixed `NEXT_PUBLIC_` if needed) |

---

## 15. Out of Scope

- User accounts / auth (Sprint 11)
- Template Pack payments (Sprint 12)
- Professional Rewrite payments (Sprint 13)
- Subscription/recurring billing
- Refunds (handle manually in Stripe Dashboard for now)
- Receipt emails (Stripe sends these automatically)
- Tax calculation (handle later, Stripe Tax)
