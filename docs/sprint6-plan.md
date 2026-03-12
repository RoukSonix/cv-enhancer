# Sprint 6: Error Handling & UX Polish — Implementation Plan

**Created:** 2026-03-12
**Branch:** `sprint6/error-handling-ux`
**Goal:** Robust error handling and polished user experience. Replace inline errors with toasts, add file validation, timeout/retry logic, error boundary, loading skeleton, and mobile responsiveness fixes.

---

## Overview

Sprint 6 focuses on nine areas:

1. Replace inline error text with **sonner toast notifications** (already installed)
2. **API timeout handling** with retry button after 30s
3. **File validation**: reject >5MB, reject non-PDF, show file name + size
4. **"Try again" button** on error states
5. **Prevent double-submit** (already partially done — audit)
6. **Mobile responsiveness audit** and fixes
7. **Error boundary** component for React errors
8. **Loading skeleton** for `/roast/[id]` page
9. **Tests** for all new error flows

---

## 1. Replace Inline Errors with Toasts — `ResumeUpload.tsx`

**File:** `src/components/ResumeUpload.tsx`

### Current inline errors to convert

| Line | Current code | Toast replacement |
|------|-------------|-------------------|
| 38 | `setEmailError("A valid email address is required.")` | `toast.error("A valid email address is required.")` |
| 43 | `setEmailError("Please enter a valid email address.")` | `toast.error("Please enter a valid email address.")` |
| 58 | `setError("Please upload a PDF or paste your resume text.")` | `toast.error("Please upload a PDF or paste your resume text.")` |
| 67 | `setError(data.error \|\| "Something went wrong.")` | `toast.error(data.error \|\| "Something went wrong.")` |
| 73 | `setError("Network error. Please try again.")` | `toast.error("Network error. Please try again.")` |
| 87 | `setError("Only PDF files are accepted.")` | `toast.error("Only PDF files are accepted.")` |
| 212 | `{emailError && <p>...}` | Remove inline element |
| 230 | `{error && <p>...}` | Remove inline element |

### Changes

1. Add `import { toast } from "sonner"` at the top
2. Remove `error` and `emailError` state variables
3. Replace all `setError(...)` calls with `toast.error(...)`
4. Replace all `setEmailError(...)` calls with `toast.error(...)`
5. Remove the two inline error `<p>` elements (lines 212, 230)
6. Keep the email `onBlur` validation — convert to `toast.error()`

**Pattern match:** `RoastResults.tsx` already uses `toast.error()` (lines 62, 66, 83, 87) — follow identical pattern.

### Email onBlur edge case

The `onBlur` handler (line 202-206) currently sets inline error. Convert to:
```tsx
onBlur={() => {
  if (email.trim() && !isValidEmail(email)) {
    toast.error("Please enter a valid email address.");
  }
}}
```

---

## 2. API Timeout with Retry — `ResumeUpload.tsx`

**File:** `src/components/ResumeUpload.tsx`

### Design

- Use `AbortController` with a 30s timeout on the `fetch("/api/roast", ...)` call
- When timeout fires: abort the fetch, show toast, display a "Try Again" button
- Timeout is configurable via a constant (`const ROAST_TIMEOUT_MS = 30_000`)

### New state

```ts
const [timedOut, setTimedOut] = useState(false);
```

### Updated handleSubmit

```ts
const ROAST_TIMEOUT_MS = 30_000;

async function handleSubmit() {
  setLoading(true);
  setTimedOut(false);

  try {
    // ... validation ...

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setTimedOut(true);
    }, ROAST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong.");
        return;
      }
      onResult(data as RoastResult);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Request timed out. Please try again.");
        setTimedOut(true);
      } else {
        toast.error("Network error. Please try again.");
      }
    }
  } catch {
    toast.error("Something went wrong.");
  } finally {
    setLoading(false);
  }
}
```

### Timeout UI

When `loading` is true and timeout hasn't fired yet, show `<LoadingRoast />` as before.

When `timedOut` is true (and `loading` is false), show a retry state instead of the regular form:

```tsx
if (timedOut) {
  return (
    <Card className="w-full max-w-2xl mx-auto border-fire-orange/20">
      <CardContent className="pt-6 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-fire-orange" />
        <p className="font-medium">The roast is taking longer than expected</p>
        <p className="text-sm text-muted-foreground">
          Our AI might be overwhelmed. Give it another shot.
        </p>
        <Button
          onClick={() => { setTimedOut(false); handleSubmit(); }}
          className="gradient-fire text-white font-semibold border-0"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Button
          variant="ghost"
          onClick={() => setTimedOut(false)}
          className="text-muted-foreground"
        >
          Change resume
        </Button>
      </CardContent>
    </Card>
  );
}
```

Import `AlertTriangle` and `RefreshCw` from lucide-react.

---

## 3. File Validation — `ResumeUpload.tsx`

**File:** `src/components/ResumeUpload.tsx`

### 3a. File size validation (>5MB)

Add a constant and validation function:

```ts
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "Only PDF files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${formatFileSize(file.size)}). Maximum size is 5MB.`;
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### 3b. Apply validation in three places

**File input `onChange` (line 152-158):**
```tsx
onChange={(e) => {
  const f = e.target.files?.[0];
  if (f) {
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      e.target.value = ""; // reset file input
    } else {
      setFile(f);
    }
  }
}}
```

**Drag-drop `handleDrop` (line 79-89):**
```tsx
function handleDrop(e: React.DragEvent) {
  e.preventDefault();
  setDragOver(false);
  const dropped = e.dataTransfer.files[0];
  if (!dropped) return;
  const err = validateFile(dropped);
  if (err) {
    toast.error(err);
  } else {
    setFile(dropped);
  }
}
```

**`handleSubmit` (before FormData construction):**
Add a re-validation check as a safety net:
```ts
if (mode === "upload" && file) {
  const fileErr = validateFile(file);
  if (fileErr) {
    toast.error(fileErr);
    setFile(null);
    setLoading(false);
    return;
  }
  formData.set("resume", file);
}
```

### 3c. Show file name + size after upload

Replace the file-selected UI (lines 160-167):

```tsx
{file ? (
  <div className="space-y-2">
    <Upload className="w-8 h-8 mx-auto text-fire-orange" />
    <p className="text-sm font-medium text-foreground">{file.name}</p>
    <p className="text-xs text-muted-foreground">
      {formatFileSize(file.size)} · Click or drop to replace
    </p>
  </div>
) : (
  // ... existing empty state ...
)}
```

### 3d. Server-side file size validation

**File:** `src/app/api/roast/route.ts`

Add a check after extracting the file (around line 48):

```ts
if (file) {
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 413 }
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  resumeText = await extractTextFromPdf(buffer);
}
```

---

## 4. "Try Again" Button on Error States

### Design

Since we're removing inline error state, the "try again" pattern is handled by:

1. **Timeout state**: Dedicated retry UI with "Try Again" button (section 2 above)
2. **API/network errors**: Toast notification — user can simply re-click "Roast My Resume" since form state is preserved (file, text, email all remain)
3. **Validation errors**: Toast notification — user fixes the issue and re-submits

The button is NOT disabled after an error (only during loading), so the user can always retry.

**No additional "Try Again" button needed on the main form** — the submit button serves this purpose since form state is preserved after errors. The timeout case gets its own dedicated retry UI (section 2).

---

## 5. Prevent Double-Submit Audit

**File:** `src/components/ResumeUpload.tsx`

### Current state

- Line 234-238: Button `disabled` logic checks `hasResume` and `emailOk`
- Line 24: `loading` state exists but is **not** used in the disabled condition
- Line 91-98: When `loading` is true, the entire form is replaced with `<LoadingRoast />`, so the button is not visible — effectively preventing double-submit

### Assessment

Already implemented via UI replacement (loading state replaces form). However, there's a brief moment between `handleSubmit()` start and `setLoading(true)` where a fast double-click could fire two requests. Current code sets loading on line 32, which is the first line of `handleSubmit`, so this is minimal risk.

**No changes needed.** The form-replacement pattern is sufficient. If we wanted belt-and-suspenders, we could add `loading` to the disabled condition, but it would never actually be visible since the form is hidden during loading.

---

## 6. Mobile Responsiveness Audit

**Files to audit:**
- `src/components/ResumeUpload.tsx`
- `src/components/RoastResults.tsx`
- `src/components/RoastResultsFull.tsx`
- `src/components/LoadingRoast.tsx`
- `src/app/page.tsx`
- `src/app/roast/[id]/page.tsx`
- `src/components/SharedRoastView.tsx`
- `src/app/checkout/success/SuccessPoller.tsx`
- `src/app/checkout/cancel/page.tsx`

### Known responsive patterns already in place

- `max-w-2xl mx-auto` on cards — good for mobile
- `sm:text-5xl` on hero h1 — good breakpoint
- `sm:flex-row` on cross-sell buttons — stacks on mobile
- `flex-wrap` on feature pills — wraps on mobile
- `container mx-auto px-4` on main content — proper padding

### Areas to check and fix

| Component | Potential issue | Fix |
|-----------|----------------|-----|
| `ResumeUpload.tsx` | Drag-drop area `p-10` padding may be too large on small screens | Change to `p-6 sm:p-10` |
| `ResumeUpload.tsx` | Segmented control may overflow on very narrow screens | Add `text-xs sm:text-sm` to button text |
| `RoastResults.tsx` | Score card content may crowd on mobile | Verify padding is sufficient |
| `page.tsx` | Feature pills gap may be too large | Currently `gap-3` — fine |
| Sticky header | Buttons may crowd on mobile | Check `flex-wrap` or responsive sizing |
| Timeout retry UI (new) | Ensure buttons stack vertically on mobile | Use `flex flex-col sm:flex-row` |

### Implementation

Make a pass through each component and apply responsive padding/sizing fixes where needed. Most changes will be small Tailwind class adjustments.

---

## 7. Error Boundary Component

**File:** `src/components/ErrorBoundary.tsx` (NEW)

### Design

React error boundaries must be class components. Create a reusable error boundary with the fire theme:

```tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-fire-orange/20">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="w-12 h-12 mx-auto text-fire-orange" />
              <h2 className="text-lg font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="gradient-fire text-white font-semibold border-0"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Integration

**File:** `src/app/layout.tsx`

Wrap `{children}` in the error boundary:

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

// In RootLayout return:
<body ...>
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
  <Toaster theme="dark" richColors />
</body>
```

**Note:** The Toaster stays outside the ErrorBoundary so toasts still work even when the boundary catches an error.

---

## 8. Loading Skeleton for `/roast/[id]`

**File:** `src/app/roast/[id]/loading.tsx` (NEW)

Next.js automatically uses `loading.tsx` as a Suspense fallback for the page. Create a skeleton that mirrors the `RoastResults` layout:

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function RoastLoading() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.75 0.15 55 / 0.08), transparent 70%)",
        }}
      />

      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
        {/* Score card skeleton */}
        <Card className="border-fire-orange/10">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Skeleton className="h-5 w-16 mx-auto rounded-full" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-24 w-24 mx-auto rounded-full" />
            <Skeleton className="h-6 w-24 mx-auto rounded-full" />
            <Skeleton className="h-12 w-full max-w-lg mx-auto" />
          </CardContent>
        </Card>

        {/* Top Issues skeleton */}
        <Card className="border-fire-orange/10">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ATS skeleton */}
        <Card className="border-fire-orange/10">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>

        {/* Section skeleton */}
        <Card className="border-fire-orange/10 border-l-4 border-l-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
```

This skeleton matches the visual structure of the results page — score card, top issues list, ATS bar, and a section card — all with pulsing muted backgrounds.

---

## 9. Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/ResumeUpload.tsx` | **Modify** | Toast errors, file validation, timeout/retry, mobile fixes |
| `src/app/api/roast/route.ts` | **Modify** | Server-side file size validation (413 response) |
| `src/components/ErrorBoundary.tsx` | **Create** | React error boundary with fire-themed fallback UI |
| `src/app/layout.tsx` | **Modify** | Wrap children in ErrorBoundary |
| `src/app/roast/[id]/loading.tsx` | **Create** | Loading skeleton for permalink page |
| `src/components/RoastResults.tsx` | **Audit** | Verify mobile responsiveness (likely no changes) |
| `src/components/RoastResultsFull.tsx` | **Audit** | Verify mobile responsiveness (likely no changes) |
| `src/app/page.tsx` | **Audit** | Verify mobile responsiveness (likely no changes) |
| `src/components/SharedRoastView.tsx` | **Audit** | Verify mobile responsiveness (likely no changes) |

---

## 10. Error States Catalog

Every possible error in the application and how it's handled after Sprint 6:

### Upload/Validation Errors

| Error | Trigger | Current handling | Sprint 6 handling |
|-------|---------|-----------------|-------------------|
| No resume provided | Submit with no file/text | Inline error text | `toast.error()` |
| Non-PDF file (input) | Select non-PDF via file picker | `accept=".pdf"` prevents (browser-level) | `accept=".pdf"` + `validateFile()` toast |
| Non-PDF file (drag-drop) | Drop a non-PDF file | Inline error text | `toast.error("Only PDF files are accepted.")` |
| File too large (>5MB) | Select/drop file >5MB | **No validation** | `toast.error("File too large (X MB). Maximum size is 5MB.")` |
| Resume text too short | Paste <50 chars | API returns 400 → inline error | API returns 400 → `toast.error()` |
| Invalid email (blur) | Type bad email and blur | Inline error text | `toast.error()` |
| Missing email (free tier) | Submit without email | Inline error text | `toast.error()` |
| Invalid email (submit) | Submit with bad format | Inline error text | `toast.error()` |

### API Errors

| Error | Trigger | Current handling | Sprint 6 handling |
|-------|---------|-----------------|-------------------|
| API 400 (validation) | Server-side validation failure | Inline error text | `toast.error(data.error)` |
| API 413 (file too large) | File passes client but fails server | **Not handled** | `toast.error()` + server returns 413 |
| API 500 (server error) | AI failure, Prisma error, etc. | Inline error text | `toast.error()` |
| Network error | No connectivity, DNS failure | Inline error text | `toast.error("Network error. Please try again.")` |
| API timeout (30s) | AI takes too long | **No handling** (waits up to 60s) | AbortController timeout → retry UI |

### Payment Errors (already handled with toasts)

| Error | Trigger | Current handling | Sprint 6 handling |
|-------|---------|-----------------|-------------------|
| Checkout creation failed | Stripe API error | `toast.error()` | No change |
| Credit redemption failed | No credits or API error | `toast.error()` | No change |
| Share link copy failed | Clipboard API blocked | `toast.error()` | No change |

### React Runtime Errors

| Error | Trigger | Current handling | Sprint 6 handling |
|-------|---------|-----------------|-------------------|
| Component crash | Unhandled JS error in render | White screen (React default) | ErrorBoundary → "Something went wrong" + Refresh |
| Missing data | Null result prop | Crash | ErrorBoundary catches it |

### Page Load Errors

| Error | Trigger | Current handling | Sprint 6 handling |
|-------|---------|-----------------|-------------------|
| Roast not found | Invalid `/roast/[id]` URL | `notFound()` → Next.js 404 | No change (already correct) |
| DB unavailable | Prisma connection error | `notFound()` (no try/catch) | No change (acceptable — server component) |
| Slow page load | DB query takes time | White screen until loaded | Loading skeleton |

---

## 11. Test Plan

### Unit Tests

**File:** `src/lib/__tests__/file-validation.test.ts` (NEW)

| Test | Description |
|------|-------------|
| `validateFile` accepts valid PDF under 5MB | Returns null (no error) |
| `validateFile` rejects file over 5MB | Returns size error message |
| `validateFile` rejects non-PDF file | Returns type error message |
| `validateFile` accepts file exactly at 5MB boundary | Returns null (5MB is the limit, not over) |
| `formatFileSize` formats bytes correctly | 500 → "500 B", 1500 → "1.5 KB", 2500000 → "2.4 MB" |

**File:** `src/lib/__tests__/timeout.test.ts` (NEW)

| Test | Description |
|------|-------------|
| `ROAST_TIMEOUT_MS` is 30000 | Constant value check |
| AbortError is caught and identified | Verify timeout detection logic |

### E2E Tests

**File:** `e2e/error-handling.spec.ts` (NEW)

| Test | Description |
|------|-------------|
| Drag-drop non-PDF shows toast error | Drop a .txt file → toast appears |
| Select oversized file shows toast error | Upload >5MB file → toast appears |
| File name + size displayed after upload | Upload valid PDF → name + size visible |
| API error shows toast (not inline text) | Mock API 500 → toast visible, no inline red text |
| No inline error text elements on page | Assert no `.text-destructive` error paragraphs |
| Timeout shows retry UI | Mock slow API → retry button appears after 30s |
| Retry button re-submits | Click retry → loading state starts again |
| Error boundary catches render crash | Force render error → "Something went wrong" UI |
| Loading skeleton on /roast/[id] | Navigate to permalink → skeleton visible before content |

### Existing Test Updates

**File:** `e2e/roast-flow.spec.ts` — Verify still passes (no inline error text assertions to remove)

**File:** `e2e/email-capture.spec.ts` — May need update if it asserts inline email error text. Convert to check for toast instead.

---

## 12. Implementation Order

1. **Extract `validateFile` and `formatFileSize`** helper functions (can be in ResumeUpload.tsx or a new `src/lib/file.ts`)
2. **Modify `ResumeUpload.tsx`**: toast imports, remove inline error state, add file validation, add timeout logic, mobile tweaks
3. **Modify `src/app/api/roast/route.ts`**: server-side file size check
4. **Create `ErrorBoundary.tsx`** and integrate in `layout.tsx`
5. **Create `loading.tsx`** for `/roast/[id]`
6. **Mobile responsiveness pass** across all components
7. **Write unit tests** for file validation
8. **Write E2E tests** for error flows
9. **Update `docs/STATUS.md`**

---

## 13. Out of Scope (Deferred)

- Rate limiting on API (Sprint 8+)
- Progressive upload with progress indicator
- Client-side PDF parsing/preview
- Retry logic for payment endpoints (already handled by Stripe redirect)
- Custom 404 page styling
- Custom favicon (tracked as known issue)

---

## 14. Backward Compatibility

- **No breaking changes** to existing components or API contracts
- Error handling is purely additive (toasts replace inline text)
- `ErrorBoundary` wraps existing children transparently
- `loading.tsx` is a new file with no impact on existing page behavior
- Server-side 413 response is a new error code but client already handles non-ok responses generically

---

## Validation: APPROVED

**Validated:** 2026-03-12
**Validator:** Claude (validation agent)

### Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Toast migration — all 8 inline errors identified | PASS — all 6 `setError`/`setEmailError` calls, both `<p>` elements, and `onBlur` handler accounted for. Line numbers match source. |
| 2 | AbortController timeout with Next.js formData POST | PASS — `signal` works with any `fetch` including FormData. Timeout → abort → catch → retry UI flow is correct. |
| 3 | File validation at the right points (input, drag, submit) | PASS — three client-side points plus server-side 413. Defense-in-depth. |
| 4 | ErrorBoundary class component with App Router | PASS — `"use client"` directive is correct. `<Toaster>` correctly outside boundary. |
| 5 | Loading skeleton for `/roast/[id]` | PASS — `loading.tsx` is correct Next.js convention. Skeleton mirrors `SharedRoastView` layout. |
| 6 | Existing E2E test breakage | PASS — `email-capture.spec.ts` correctly flagged as needing toast assertion update. Other tests unaffected. |
| 7 | Mobile breakpoints | PASS — drop zone padding, segmented control text, and retry button stacking correctly targeted. |
| 8 | Error states catalog completeness | PASS — 21 states across 5 categories. Comprehensive. |

### Fixes applied during validation

- **Test plan bug (Section 11):** Changed `validateFile rejects file exactly at 5MB limit` → `validateFile accepts file exactly at 5MB boundary` (description contradicted expected result of `null`/pass).

### Notes for implementation

- **ErrorBoundary scope:** Only catches client-side render errors. Server component errors in `/roast/[id]/page.tsx` still surface as Next.js defaults. Consider adding `src/app/roast/[id]/error.tsx` in a future sprint for full coverage.
- **JSON parse edge case:** If API returns non-JSON, the catch block shows "Network error" — technically inaccurate but functional and rare. Acceptable for Sprint 6 scope.
- **`setTimedOut(true)` duplication:** Called in both setTimeout callback and AbortError catch. Harmless (idempotent), no fix needed.
