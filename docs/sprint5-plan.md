# Sprint 5: Email Capture — Implementation Plan

**Created:** 2026-03-12
**Branch:** `sprint5/email-capture`
**Goal:** Collect email before showing free roast results (lead generation). Store emails in DB. No actual email sending yet.

---

## Overview

Add an email input field to the resume upload form. Email is **required** for free tier, **optional** for paid tier. Include a marketing opt-in checkbox and GDPR consent text. Store email + opt-in preference on the Roast record. Show confirmation on results page. Provide a basic admin endpoint to export collected emails.

---

## 1. Prisma Schema Changes

**File:** `prisma/schema.prisma`

Add two optional fields to the existing `Roast` model:

```prisma
model Roast {
  // ... existing fields ...

  // Sprint 5: Email capture
  email           String?                  // user's email (required for free, optional for paid)
  marketingOptIn  Boolean   @default(false) // true if user checked "Send me resume tips"

  // ... existing indexes ...
  @@index([email])           // NEW: for email lookups/export
}
```

**Why optional (`String?`):** Backward compatibility — existing roasts have no email. Paid tier users can skip email.

**Migration:** Run `npx prisma db push` (dev) or generate a migration.

---

## 2. Type Changes

**File:** `src/lib/types.ts`

Add `email` and `marketingOptIn` to `RoastResult`:

```ts
export interface RoastResult {
  // ... existing fields ...
  email?: string;           // NEW
  marketingOptIn?: boolean; // NEW
}
```

Both optional on the type to maintain backward compat with existing stored results.

---

## 3. Email Validation Utility

**File:** `src/lib/email.ts` (NEW)

Create a small utility with:

```ts
/** Basic email format validation (client + server reuse) */
export function isValidEmail(email: string): boolean {
  // Standard HTML5 email regex — good enough for format check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
```

Keep it simple — no heavyweight library. This runs client-side (in `ResumeUpload`) and server-side (in `POST /api/roast`).

---

## 4. Component Changes: `ResumeUpload.tsx`

**File:** `src/components/ResumeUpload.tsx`

### New state variables

```ts
const [email, setEmail] = useState("");
const [marketingOptIn, setMarketingOptIn] = useState(false);
const [emailError, setEmailError] = useState("");
```

### New UI elements (inserted between the paste/upload area and the "Roast My Resume" button)

**a) Email input field:**
- Standard `<input type="email">` with fire-themed border styling
- Placeholder: `"your@email.com"`
- Label: `"Email address"` (visually hidden or above input)
- On blur: validate with `isValidEmail()` → show inline error if invalid
- Required for free tier (`tier !== "paid"`), optional for paid tier
- If paid tier: show helper text "Optional — skip if you prefer"

**b) Marketing opt-in checkbox:**
- `<label>` with `<input type="checkbox">`
- Text: "Send me resume tips & career advice"
- Default: **unchecked** (GDPR-compliant opt-in)

**c) GDPR consent text:**
- Small muted text below checkbox:
- "We'll only use your email to deliver your results and, if opted in, send career tips. You can unsubscribe anytime."

### Submit logic changes

In `handleSubmit()`:
1. If free tier and email is empty/invalid → set `emailError`, return early
2. If email provided but invalid format → set `emailError`, return early
3. Append to formData:
   - `formData.set("email", email.trim())`
   - `formData.set("marketingOptIn", marketingOptIn ? "true" : "false")`

### Button disabled logic update

Current: `disabled={mode === "upload" ? !file : !text.trim()}`

New (free tier): also require valid email
```ts
const hasResume = mode === "upload" ? !!file : !!text.trim();
const emailOk = tier === "paid" || isValidEmail(email);
// disabled={!hasResume || !emailOk}
```

### Mobile responsiveness

- Email input: `w-full` with appropriate padding
- Checkbox + GDPR text: stack vertically, text wraps naturally
- All new elements use existing Tailwind responsive patterns

---

## 5. API Changes: `POST /api/roast`

**File:** `src/app/api/roast/route.ts`

### Extract new fields from formData

```ts
const email = (formData.get("email") as string | null)?.trim() || null;
const marketingOptIn = formData.get("marketingOptIn") === "true";
```

### Server-side email validation

```ts
import { isValidEmail } from "@/lib/email";

// After extracting email, before AI call:
if (tier === "free" && (!email || !isValidEmail(email))) {
  return NextResponse.json(
    { error: "A valid email address is required for the free roast." },
    { status: 400 }
  );
}
if (email && !isValidEmail(email)) {
  return NextResponse.json(
    { error: "Invalid email address format." },
    { status: 400 }
  );
}
```

### Include email in RoastResult response

```ts
const result: RoastResult = {
  ...aiResult,
  id: nanoid(12),
  createdAt: new Date().toISOString(),
  email: email ?? undefined,       // NEW
  marketingOptIn,                   // NEW
};
```

### Save to database

Add `email` and `marketingOptIn` to the `prisma.roast.create()` call:

```ts
await prisma.roast.create({
  data: {
    // ... existing fields ...
    email,                // NEW (nullable)
    marketingOptIn,       // NEW
  },
});
```

---

## 6. Results Page: Email Confirmation

**File:** `src/components/RoastResults.tsx`

Add a small confirmation line below the score card (inside the Overall Score card, after summary):

```tsx
{result.email && (
  <p className="text-xs text-muted-foreground">
    Results sent to <span className="font-medium text-foreground">{result.email}</span>
  </p>
)}
```

**Note:** This is display-only for now — no actual email is sent. The text is a forward-looking UX pattern. We can adjust the copy to "Results available for {email}" if preferred.

**File:** `src/components/RoastResultsFull.tsx`

Same treatment — add email confirmation line in the score header section.

---

## 7. Shared/Permalink Results

**File:** `src/app/roast/[id]/page.tsx`

The `GET /api/roast/[id]` endpoint already returns the full `result` JSON which will now include `email`. The `SharedRoastView` component renders `RoastResults` or `RoastResultsFull`, which will pick up the email display from step 6.

**Privacy consideration:** Email is embedded in the `result` JSON stored in DB. On the shared permalink page, we must **not** expose the email to protect privacy. **Strip email server-side** in `page.tsx` (the server component) before passing data to the client component — this prevents the email from ever reaching the browser on shared pages:

```tsx
// In src/app/roast/[id]/page.tsx (server component), BEFORE passing to SharedRoastView:
const safeResult = { ...roast.result, email: undefined, marketingOptIn: undefined };
// Pass safeResult (not result) to SharedRoastView
```

**Why server-side:** If stripped only in the client component (`SharedRoastView`), the email still travels in the serialized page props to the browser and could be visible in the page source/network tab. Server-side stripping ensures it never leaves the server.

---

## 8. Admin Email Export Endpoint

**File:** `src/app/api/admin/emails/route.ts` (NEW)

Basic GET endpoint to export collected emails. **No auth for now** (deferred to future sprint).

> **⚠ Security note:** This endpoint exposes PII (emails). Before any production deployment, add authentication (e.g., API key check or admin session). For local dev / staging this is acceptable.

```ts
// GET /api/admin/emails
// Query params: ?format=json (default) or ?format=csv
// Returns: list of { email, marketingOptIn, createdAt, roastId }
```

Implementation:
```ts
export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") || "json";

  const emails = await prisma.roast.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      email: true,
      marketingOptIn: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (format === "csv") {
    const csv = [
      "email,marketing_opt_in,created_at,roast_id",
      ...emails.map(r => `${r.email},${r.marketingOptIn},${r.createdAt.toISOString()},${r.id}`),
    ].join("\n");
    return new Response(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=emails.csv" },
    });
  }

  return NextResponse.json({ emails, total: emails.length });
}
```

---

## 9. Files Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `email` (String?) and `marketingOptIn` (Boolean) to Roast |
| `src/lib/types.ts` | Modify | Add `email?` and `marketingOptIn?` to `RoastResult` |
| `src/lib/email.ts` | Create | `isValidEmail()` utility |
| `src/components/ResumeUpload.tsx` | Modify | Add email input, checkbox, GDPR text, validation |
| `src/app/api/roast/route.ts` | Modify | Extract email/optIn from formData, validate, save to DB |
| `src/components/RoastResults.tsx` | Modify | Show email confirmation line |
| `src/components/RoastResultsFull.tsx` | Modify | Show email confirmation line |
| `src/components/SharedRoastView.tsx` | Modify | Strip email from shared results (privacy) |
| `src/app/api/admin/emails/route.ts` | Create | Email export endpoint (JSON + CSV) |

---

## 10. Test Plan

### Unit Tests

**File:** `src/lib/__tests__/email.test.ts` (NEW)

| Test | Description |
|------|-------------|
| `isValidEmail("user@example.com")` → true | Valid standard email |
| `isValidEmail("name+tag@domain.co.uk")` → true | Valid email with plus and subdomain |
| `isValidEmail("")` → false | Empty string |
| `isValidEmail("notanemail")` → false | Missing @ and domain |
| `isValidEmail("@domain.com")` → false | Missing local part |
| `isValidEmail("user@")` → false | Missing domain |
| `isValidEmail("user @example.com")` → false | Spaces not allowed |
| `isValidEmail("  user@example.com  ")` → true | Trims whitespace |

**File:** `src/lib/__tests__/email-api.test.ts` (NEW)

| Test | Description |
|------|-------------|
| Free tier POST without email → 400 | Email required for free tier |
| Free tier POST with invalid email → 400 | Rejects malformed email |
| Free tier POST with valid email → proceeds | Email accepted, included in result |
| Paid tier POST without email → proceeds | Email optional for paid |
| `marketingOptIn=true` stored correctly | Opt-in persisted |
| `marketingOptIn` defaults to false | Missing field defaults to false |
| Email stored in DB after roast | Verify Prisma record has email |

### Existing E2E Test Updates

**File:** `e2e/roast-flow.spec.ts` (MODIFY)

The existing roast-flow test submits a free-tier roast without filling in an email. With email now required for free tier, the **submit button will be disabled** and the test will fail. Update the test to:

1. Fill in a valid email (e.g., `test@example.com`) before clicking "Roast My Resume"
2. Optionally assert the email confirmation text appears on the results page

**File:** `e2e/paid-tier.spec.ts` — Review and confirm it still passes. Paid-tier tests should be unaffected since email is optional for paid tier, and the button enable logic only gates on email for free tier.

### New E2E Tests

**File:** `e2e/email-capture.spec.ts` (NEW)

| Test | Description |
|------|-------------|
| Email input visible on upload form | Field exists and is rendered |
| Submit blocked without email (free tier) | Button disabled or error shown |
| Invalid email shows inline error | Type "notanemail" → blur → error |
| Valid email enables submit | Type valid email → button enabled |
| Marketing checkbox unchecked by default | Verify initial state |
| GDPR text visible | Consent copy rendered |
| Email shown on results page | After roast, confirmation text visible |
| Email NOT shown on shared result page | Privacy: strip email from public view |

### Admin Export Tests

**File:** `src/lib/__tests__/admin-emails.test.ts` (NEW)

| Test | Description |
|------|-------------|
| GET /api/admin/emails returns JSON | Default format |
| GET /api/admin/emails?format=csv returns CSV | CSV download |
| Only roasts with email are returned | Null emails excluded |
| Response includes marketingOptIn field | Opt-in status exported |

---

## 11. Edge Cases & Backward Compatibility

- **Existing roasts without email:** `email` is `String?` (nullable) — existing records unaffected
- **Shared results privacy:** Email stripped before rendering on public permalink pages
- **Paid tier bypass:** No email gate for paid tier — they already provided payment info
- **Webhook-created roasts (Stripe):** These don't go through the upload form, so `email` stays null — acceptable since they paid
- **Bundle credit redemption:** Same — no email gate for paid users
- **Database migration:** `prisma db push` adds nullable columns — no data loss

---

## 12. Out of Scope (Deferred)

- Actual email sending (Resend integration) — future sprint
- Email verification / double opt-in
- Unsubscribe mechanism
- Admin authentication for `/api/admin/emails`
- Rate limiting on email collection
- Email deduplication logic (same email, multiple roasts — allowed for now)

---

## Validation: APPROVED

**Validated:** 2026-03-12

### Checks Performed

| # | Check | Result |
|---|-------|--------|
| 1 | Prisma `email String?` nullable for backward compat | ✅ Correct — existing rows get `null`, no migration issues |
| 2 | ResumeUpload works with existing `tier` prop | ✅ Correct — `tier?: "free" \| "paid"` already exists, plan keys off it properly |
| 3 | Client + server email validation | ✅ Correct — shared `isValidEmail()` used in both layers |
| 4 | Admin endpoint auth | ✅ Acceptable for dev — security warning added to plan |
| 5 | Existing E2E tests won't break | ⚠️ **Fixed** — `roast-flow.spec.ts` would break (button disabled without email). Added update instructions to plan |
| 6 | GDPR text legally sufficient | ✅ Adequate for MVP — covers purpose, consent, withdrawal right |
| 7 | Email stripped from shared results | ⚠️ **Fixed** — changed from client-side to server-side stripping in `page.tsx` to prevent email leaking in page props |
| 8 | formData approach with current API | ✅ Correct — API already uses formData, adding fields is straightforward |

### Issues Found & Resolved

1. **E2E test breakage (critical):** Existing `roast-flow.spec.ts` submits a free-tier roast without email. The new button-disable logic (`!emailOk`) would cause it to fail. → Added section requiring test update.

2. **Privacy: client-side stripping insufficient:** Original plan stripped email in `SharedRoastView` (client component), but email would still be serialized in page props and visible in browser source/network tab. → Changed to server-side stripping in `page.tsx` before data reaches the client.

3. **Admin endpoint security note:** Added explicit warning about PII exposure before production deployment.
