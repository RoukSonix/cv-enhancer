# Sprint 0: Bug Fixes — Implementation Plan

**Created:** 2026-03-11
**Branch:** `sprint0/bug-fixes`
**Issues:** [#1](https://github.com/RoukSonix/cv-enhancer/issues/1), [#2](https://github.com/RoukSonix/cv-enhancer/issues/2), [#3](https://github.com/RoukSonix/cv-enhancer/issues/3)

---

## Prerequisites

### Install `sonner` via shadcn (toast notification library)

```bash
npx shadcn@latest add sonner
```

- **Why sonner:** Lightweight, unstyled by default (respects our dark theme), widely used with shadcn/ui projects.
- **Use the shadcn approach** (not bare `npm install sonner`) to stay consistent with the existing shadcn setup (`components.json` present, all UI components in `src/components/ui/`). This creates a `src/components/ui/sonner.tsx` wrapper with `"use client"` already set.
- The `toast` function is still imported directly from `"sonner"` in consumer files.

### Add `<Toaster />` to root layout

**File:** `src/app/layout.tsx`

- Import `Toaster` from `@/components/ui/sonner` (the shadcn wrapper, **not** from `"sonner"` directly)
- Add `<Toaster />` inside `<body>`, after `{children}`
- Configure for dark theme: `<Toaster theme="dark" richColors />`
- **Note:** `layout.tsx` is a Server Component (no `"use client"`). This is fine — Next.js App Router allows rendering client components (like the shadcn Toaster wrapper) from server components.

---

## Issue #1: Share Results button has no click handler

**GitHub:** [#1](https://github.com/RoukSonix/cv-enhancer/issues/1)
**Problem:** The "Share Results" button in the sticky header (`src/app/page.tsx:37-40`) renders but has no `onClick` handler.

### File to modify

**`src/app/page.tsx`**

### Changes

1. Add imports at the top of the file:
   ```tsx
   import { toast } from "sonner";
   ```

2. Add `onClick` handler to the Share Results `<Button>` (line 37):
   ```tsx
   <Button
     variant="outline"
     size="sm"
     className="gap-1.5"
     onClick={async () => {
       try {
         await navigator.clipboard.writeText(window.location.href);
         toast.success("Link copied!");
       } catch {
         toast.error("Failed to copy link");
       }
     }}
   >
     <Share2 className="w-3.5 h-3.5" />
     Share Results
   </Button>
   ```

### Why this approach

- `navigator.clipboard.writeText()` is the modern Clipboard API — works in all major browsers (HTTPS or localhost only).
- The `try/catch` handles the case where clipboard access is denied (e.g., iframe sandbox, older HTTP-only setups).
- Copies the current page URL. In Sprint 1, this will be updated to copy a shareable `/roast/[id]` URL instead.

### Test cases

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Click "Share Results" button | Toast shows "Link copied!" and URL is in clipboard |
| 2 | Paste from clipboard after clicking | Should contain `http://localhost:3000` (or current URL) |
| 3 | Button should only appear when results are shown | Button is inside the `{result && ...}` block — verify not visible on landing page |
| 4 | Clipboard API failure (simulate by overriding `navigator.clipboard`) | Toast shows "Failed to copy link" |

---

## Issue #2: Payment buttons have no click handlers

**GitHub:** [#2](https://github.com/RoukSonix/cv-enhancer/issues/2)
**Problem:** Three payment buttons in `RoastResults.tsx` have no `onClick` handlers. They render but do nothing when clicked.

### Buttons affected

| Button | Location in `src/components/RoastResults.tsx` |
|--------|-----------------------------------------------|
| "Get Full Roast -- $9.99" | Line 202–207 (upsell card) |
| "Resume Template Pack -- $29" | Line 221–227 (cross-sell) |
| "Professional Rewrite -- $99" | Line 228–235 (cross-sell) |

### File to modify

**`src/components/RoastResults.tsx`**

### Changes

1. Add import at the top of the file:
   ```tsx
   import { toast } from "sonner";
   ```

2. Add `onClick` to **"Get Full Roast -- $9.99"** button (line 202):
   ```tsx
   <Button
     size="lg"
     className="w-full gradient-fire text-white font-semibold h-12 hover:opacity-90 transition-opacity border-0 animate-pulse-glow"
     onClick={() => toast("Coming soon!", { description: "Payments will be available shortly." })}
   >
     Get Full Roast -- $9.99
   </Button>
   ```

3. Add `onClick` to **"Resume Template Pack -- $29"** button (line 221):
   ```tsx
   <Button
     variant="outline"
     size="sm"
     className="hover:border-fire-orange hover:text-fire-orange transition-colors"
     onClick={() => toast("Coming soon!", { description: "Payments will be available shortly." })}
   >
     Resume Template Pack -- $29
   </Button>
   ```

4. Add `onClick` to **"Professional Rewrite -- $99"** button (line 228):
   ```tsx
   <Button
     variant="outline"
     size="sm"
     className="hover:border-fire-orange hover:text-fire-orange transition-colors"
     onClick={() => toast("Coming soon!", { description: "Payments will be available shortly." })}
   >
     Professional Rewrite -- $99
   </Button>
   ```

### Why this approach

- All three buttons get the same "Coming soon!" toast — consistent UX and a clear signal that the feature isn't broken, just not built yet.
- The `description` field adds context ("Payments will be available shortly.") without being misleading.
- When Sprint 4 (Stripe Integration) is implemented, these handlers will be replaced with actual checkout flows.

### Test cases

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Click "Get Full Roast -- $9.99" | Toast shows "Coming soon!" with description |
| 2 | Click "Resume Template Pack -- $29" | Toast shows "Coming soon!" with description |
| 3 | Click "Professional Rewrite -- $99" | Toast shows "Coming soon!" with description |
| 4 | Click all three rapidly | Each click produces a separate toast, no errors |
| 5 | No console errors after clicking any button | Clean console |

---

## Issue #3: Social proof numbers are hardcoded

**GitHub:** [#3](https://github.com/RoukSonix/cv-enhancer/issues/3)
**Problem:** The landing page shows "1,200+ resumes roasted" and "4.8 avg. satisfaction" — these are fabricated numbers with no data backing them.

### File to modify

**`src/app/page.tsx`**

### Changes

Replace the social proof section (lines 102–105):

**Before:**
```tsx
<div className="flex justify-center gap-6 text-xs text-muted-foreground/60">
  <span>1,200+ resumes roasted</span>
  <span>4.8 avg. satisfaction</span>
</div>
```

**After:**
```tsx
<div className="flex justify-center gap-6 text-xs text-muted-foreground/60">
  <span>Free instant feedback</span>
  <span>No signup required</span>
</div>
```

### Why this approach

- Removes fabricated numbers — no fake social proof.
- Replaces with honest value propositions that are factually true (the tool is free and requires no signup).
- Keeps the same visual layout and styling.
- In Sprint 10 (Analytics & Real Metrics), these will be replaced with real data from the database.

### Test cases

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Load landing page | Social proof shows "Free instant feedback" and "No signup required" |
| 2 | No numeric claims visible | No numbers like "1,200+" or "4.8" appear anywhere |
| 3 | Text is only visible on landing page, not results | Verify `{!result && ...}` conditional still works |

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `package.json` | Add `sonner` dependency |
| `src/app/layout.tsx` | Add `<Toaster />` component from sonner |
| `src/app/page.tsx` | Add clipboard onClick to Share button; replace hardcoded social proof text |
| `src/components/RoastResults.tsx` | Add "Coming soon!" onClick to 3 payment buttons |

## Post-Implementation Checklist

- [ ] `npm install` succeeds with sonner added
- [ ] `npm run build` completes without errors
- [ ] All 3 buttons in RoastResults show "Coming soon!" toast
- [ ] Share Results copies URL to clipboard and shows "Link copied!" toast
- [ ] No hardcoded numbers in social proof section
- [ ] No console errors
- [ ] Update `docs/STATUS.md` to reflect fixes
- [ ] Close GitHub Issues #1, #2, #3

---

## Validation: APPROVED

**Validated:** 2026-03-11
**Validator:** Plan Validation Agent

### Line Number Accuracy

All line references verified against current file contents:

| Reference | File | Actual Content | Status |
|-----------|------|----------------|--------|
| `page.tsx:37-40` | Share Results button | `<Button variant="outline" ...>` | Correct |
| `page.tsx:102-105` | Social proof section | `<div>...<span>1,200+...` | Correct |
| `RoastResults.tsx:202-207` | "Get Full Roast" button | `<Button size="lg" ...>` | Correct |
| `RoastResults.tsx:221-227` | "Resume Template Pack" button | `<Button variant="outline" ...>` | Correct |
| `RoastResults.tsx:228-235` | "Professional Rewrite" button | `<Button variant="outline" ...>` | Correct |

### "use client" Directives

| File | Has `"use client"` | Needs it for toast? | Status |
|------|-------------------|---------------------|--------|
| `src/app/page.tsx` | Yes (line 1) | Yes — calls `toast()` | OK |
| `src/components/RoastResults.tsx` | Yes (line 1) | Yes — calls `toast()` | OK |
| `src/app/layout.tsx` | No (Server Component) | No — only renders `<Toaster />` client component | OK |

### Corrections Made

1. **Sonner installation method:** Clarified to use `npx shadcn@latest add sonner` (not bare `npm install sonner`) for consistency with existing shadcn setup.
2. **Toaster import path:** Changed from `import { Toaster } from "sonner"` to `import { Toaster } from "@/components/ui/sonner"` to match the shadcn wrapper path.
3. **Server Component note:** Added explicit note that `layout.tsx` is a Server Component and that rendering a client component (`Toaster`) from it is valid in Next.js App Router.

### No Issues Found

- **Breaking changes:** None. All changes are additive (onClick handlers, text replacement).
- **Edge cases:** Clipboard API failure is handled with try/catch. Sonner handles rapid toast stacking gracefully.
- **Import conflicts:** No conflicts. `toast` from `"sonner"` and `Toaster` from `"@/components/ui/sonner"` are separate concerns.
- **Build safety:** All modified files are already client components (except layout.tsx which only renders a client component — valid pattern).
