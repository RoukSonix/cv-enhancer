# Sprint 12: Rewrite Service Page — Implementation Plan

**Created:** 2026-03-15
**Goal:** Offer done-for-you resume rewrite service ($99 Basic, $199 Premium).

---

## Overview

Add a `/rewrite` page offering professional resume rewrite services at two tiers. Users upload their resume, select a package, and pay via Stripe Checkout. Orders are tracked in DB with status progression (pending → paid → in_progress → delivered). Admin manages orders at `/admin/orders`. Cross-sell from roast results replaces "Coming soon!" toasts with links to `/rewrite`.

---

## Task Breakdown

### Task 1: Prisma Schema — RewriteOrder Model

**File:** `prisma/schema.prisma`

Add a new `RewriteOrder` model:

```prisma
model RewriteOrder {
  id              String    @id @default(cuid())
  email           String
  tier            String                          // "basic" or "premium"
  resumeText      String                          // original resume text from upload
  notes           String?                         // optional customer notes
  stripeSessionId String    @unique               // Stripe Checkout session ID
  status          String    @default("pending")   // pending | paid | in_progress | delivered
  createdAt       DateTime  @default(now())
  paidAt          DateTime?
  deliveredAt     DateTime?

  userId          String?
  user            User?     @relation(fields: [userId], references: [id])

  @@index([email])
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

Also add `rewriteOrders RewriteOrder[]` to the `User` model's relations.

Run `npx prisma db push` and `npx prisma generate` after schema change.

### Task 2: Environment Variables & Stripe Config

**File:** `.env.example`

Add:
```
STRIPE_PRICE_REWRITE_BASIC=price_...     # $99 Basic Rewrite
STRIPE_PRICE_REWRITE_PREMIUM=price_...   # $199 Premium Rewrite
ADMIN_EMAIL=admin@resumeroaster.com       # Email to notify on new orders
```

**File:** `src/lib/stripe.ts`

Add two new price ID exports using `requireEnv()`:
```typescript
export const STRIPE_PRICE_REWRITE_BASIC = requireEnv("STRIPE_PRICE_REWRITE_BASIC");
export const STRIPE_PRICE_REWRITE_PREMIUM = requireEnv("STRIPE_PRICE_REWRITE_PREMIUM");
```

**Stripe Dashboard:** Create two products:
- Resume Rewrite — Basic: $99.00 one-time
- Resume Rewrite — Premium: $199.00 one-time

### Task 3: Admin Email Notification Helper

**File:** `src/lib/rewrite-email.ts` (new)

Use the `resend` package (already a dependency, v6.9.3) to send transactional email to admin on new orders.

- Import `Resend` from `resend`, instantiate with `RESEND_API_KEY`
- Export `sendAdminOrderNotification(order)` function
- Sends email to `ADMIN_EMAIL` with order details: ID, customer email, tier, notes
- Includes link to `/admin/orders`
- Gracefully no-op if `ADMIN_EMAIL` or `RESEND_API_KEY` not set

### Task 4: Checkout Route — `POST /api/checkout/rewrite`

**File:** `src/app/api/checkout/rewrite/route.ts` (new)

Pattern: Follow `src/app/api/checkout/templates/route.ts`.

**Key design decision:** Create the `RewriteOrder` record with `status: "pending"` BEFORE Stripe checkout, pass `orderId` in Stripe metadata. This avoids Stripe metadata's 500-char limit for resume text (same pattern as roast checkout with `roastId`).

Logic:
1. CSRF check (origin vs host)
2. Accept `FormData`: `resume` (PDF file) OR `resumeText` (pasted text), `tier`, `email`, `notes` (optional)
3. Extract text from PDF using `extractTextFromPdf` from `src/lib/pdf-fallback.ts` if file provided
4. Validate: tier must be "basic" or "premium", resumeText non-empty, email valid
5. Get optional auth session via `auth()`
6. Create `RewriteOrder` in Prisma with `status: "pending"`, `stripeSessionId: ""` placeholder
7. Determine price ID based on tier
8. Create Stripe Checkout session with metadata `{ purchaseType: "rewrite", orderId, tier }`
9. Update order with `stripeSessionId: session.id`
10. Return `{ url: session.url }`

Success URL: `/rewrite/success?session_id={CHECKOUT_SESSION_ID}`
Cancel URL: `/rewrite`

### Task 5: Webhook Handler Extension

**File:** `src/app/api/webhooks/stripe/route.ts` (modify)

Add a new branch in `checkout.session.completed` handler for rewrite purchases. Place after the templates branch and before the `roastId` guard.

Logic:
1. Detect via `session.metadata?.purchaseType === "rewrite"`
2. Get `orderId` from metadata
3. Idempotency: check if order already past "pending"
4. Update order: `status: "paid"`, `paidAt: new Date()`, `stripeSessionId: session.id`
5. Call `sendAdminOrderNotification()` from Task 3
6. Return `{ received: true }`

### Task 6: Admin API — List Orders

**File:** `src/app/api/admin/orders/route.ts` (new)

Pattern: Follow `src/app/api/admin/stats/route.ts`.

- `GET` handler: auth check via `isAdminAuthorized(req)`, query all `RewriteOrder` records ordered by `createdAt desc`, return JSON array

### Task 7: Admin API — Update Order Status

**File:** `src/app/api/admin/orders/[id]/route.ts` (new)

- `PATCH` handler: auth check, parse `{ status }` from body
- Validate status is one of: `"pending" | "paid" | "in_progress" | "delivered"`
- Update order via Prisma; if status is `"delivered"`, also set `deliveredAt: new Date()`
- Return updated order

### Task 8: Customer Status API

**File:** `src/app/api/rewrite/status/route.ts` (new)

- `GET` handler: accept `session_id` query param
- Look up `RewriteOrder` by `stripeSessionId`
- Return `{ status, tier, createdAt }` (no sensitive data exposed)

### Task 9: Rewrite Sales Page

**File:** `src/app/rewrite/page.tsx` (new)

Client component. Pattern follows `src/app/templates/page.tsx`.

Structure:
- **Hero:** Title "Professional Resume Rewrite", subtitle, pricing badges
- **How It Works:** 3-step process (Upload → We Rewrite → You Land Interviews)
- **Pricing Tiers:** Two cards side by side
  - Basic ($99): Professional rewrite, ATS optimization, 3-day turnaround, 1 revision round
  - Premium ($199): Everything in Basic + LinkedIn profile rewrite, cover letter, 24hr turnaround, unlimited revisions, strategy call
- **Booking Form:** Embedded `RewriteBookingForm` component
- **FAQ section**

### Task 10: Booking Form Component

**File:** `src/components/RewriteBookingForm.tsx` (new)

Client component with fields:
- **Resume upload:** PDF drag-drop (reuse pattern from `ResumeUpload.tsx`) OR paste text
- **Package selection:** Radio/segmented control (Basic $99 / Premium $199)
- **Email:** Pre-filled if signed in
- **Notes:** Optional textarea ("Any specific roles or industries you're targeting?")
- **Submit button:** Dynamic text ("Book My Rewrite — $99" / "$199")

On submit: POST FormData to `/api/checkout/rewrite`, redirect to Stripe URL.

### Task 11: Success Page

**File:** `src/app/rewrite/success/page.tsx` (new)

Pattern follows `src/app/templates/success/page.tsx` (Suspense, `useSearchParams` for `session_id`).

Content:
- Checkmark + "Your rewrite order has been placed!"
- Order tier and expected turnaround
- "We'll email you when your rewrite is ready"
- "What happens next?" steps
- Cross-sell for template pack

### Task 12: Admin Orders Page

**File:** `src/app/admin/orders/page.tsx` (new)

Client component. Pattern follows `src/app/admin/page.tsx` (session check, admin auth).

Features:
- Table of all orders: ID, email, tier, status, created/paid dates
- Color-coded status badges (pending=gray, paid=amber, in_progress=blue, delivered=green)
- Expandable rows: resume text (truncated), notes, full timestamps
- Status update dropdown per row → calls `PATCH /api/admin/orders/[id]`
- Manual refresh button

### Task 13: Cross-Sell Integration

**File:** `src/components/RoastResults.tsx` (modify, ~line 324)

Replace `onClick` handler from toast ("Coming soon!") to:
```tsx
onClick={() => router.push("/rewrite")}
```

**File:** `src/components/RoastResultsFull.tsx` (modify, ~line 213)

Same change as above.

**Optional enhancement:** For users scoring below 50, add a prominent cross-sell card suggesting the rewrite service after the existing upsell block.

### Task 14: Navigation Update

**File:** `src/components/Header.tsx` (modify)

Add a "Rewrite" link in header navigation for discoverability.

### Task 15: Unit Tests

**File:** `src/lib/__tests__/rewrite.test.ts` (new)

Tests (12-15 total):
1. Checkout validation (missing/invalid tier, email, resume text)
2. Webhook order status transitions (pending → paid)
3. Webhook idempotency (no double-processing)
4. Admin API auth checks
5. Admin status update validation
6. Email notification calls Resend correctly

### Task 16: E2E Tests

**File:** `e2e/rewrite.spec.ts` (new)

Tests (6 total):
1. `/rewrite` page loads with pricing and form
2. Form validation errors
3. Package selection updates button text/price
4. File upload works in booking form
5. `/admin/orders` redirects non-admin users
6. Cross-sell button in roast results links to `/rewrite`

---

## Implementation Order

Dependencies dictate this sequence:

1. Task 1 — Prisma schema (all routes depend on this)
2. Task 2 — Stripe config & env vars
3. Task 3 — Email notification helper (standalone)
4. Task 4 — Checkout route (depends on 1, 2)
5. Task 5 — Webhook handler (depends on 1, 3)
6. Task 6 — Admin list API (depends on 1)
7. Task 7 — Admin update API (depends on 1)
8. Task 8 — Customer status API (depends on 1)
9. Task 10 — Booking form component (depends on 4)
10. Task 9 — Rewrite sales page (depends on 10)
11. Task 11 — Success page (depends on 8)
12. Task 12 — Admin orders page (depends on 6, 7)
13. Task 13 — Cross-sell updates (standalone)
14. Task 14 — Header navigation (standalone)
15. Task 15 — Unit tests (depends on 3-8)
16. Task 16 — E2E tests (depends on 9-14)

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `RewriteOrder` model + `User` relation |
| `.env.example` | Modify | Add rewrite price IDs + admin email |
| `src/lib/stripe.ts` | Modify | Add 2 new price ID exports |
| `src/lib/rewrite-email.ts` | Create | Resend admin notification helper |
| `src/app/api/checkout/rewrite/route.ts` | Create | Stripe checkout for rewrite service |
| `src/app/api/webhooks/stripe/route.ts` | Modify | Add rewrite purchase branch |
| `src/app/api/admin/orders/route.ts` | Create | Admin order list endpoint |
| `src/app/api/admin/orders/[id]/route.ts` | Create | Admin status update endpoint |
| `src/app/api/rewrite/status/route.ts` | Create | Customer order status endpoint |
| `src/components/RewriteBookingForm.tsx` | Create | Booking form with upload + tier select |
| `src/app/rewrite/page.tsx` | Create | Service sales page |
| `src/app/rewrite/success/page.tsx` | Create | Order confirmation page |
| `src/app/admin/orders/page.tsx` | Create | Admin order management page |
| `src/components/RoastResults.tsx` | Modify | Cross-sell: toast → router.push("/rewrite") |
| `src/components/RoastResultsFull.tsx` | Modify | Cross-sell: toast → router.push("/rewrite") |
| `src/components/Header.tsx` | Modify | Add "Rewrite" nav link |
| `src/lib/__tests__/rewrite.test.ts` | Create | 12-15 unit tests |
| `e2e/rewrite.spec.ts` | Create | 6 E2E tests |
| `docs/STATUS.md` | Modify | Add Sprint 12 section |

---

## Potential Challenges

1. **Stripe metadata size limit** (500 chars/value). Solved by creating order in DB first, passing only `orderId` in metadata.
2. **PDF text extraction in checkout.** Route accepts FormData (not JSON like other checkouts). Reuse `extractTextFromPdf` from `pdf-fallback.ts`.
3. **Resend transactional email.** Package is installed for Auth.js magic links; direct use requires same `RESEND_API_KEY`. `from` address must match verified Resend domain.
4. **Admin page complexity.** Keep v1 simple — flat list with status dropdowns, no pagination (low volume expected).
5. **Status race conditions.** Webhook and admin could update simultaneously. Guard with `where` clauses to prevent backwards transitions.
