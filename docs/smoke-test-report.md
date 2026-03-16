# Smoke Test Report

**Date:** 2026-03-16  
**Build:** `1ef0ecb` (Sprint 12 complete, S0-S12)  
**Environment:** Docker (dev mode), port 8601  
**Tester:** Kefir (automated browser + API)

---

## Results Summary

| Area | Status | Notes |
|------|--------|-------|
| Landing page | PASS | Hero, upload form, email capture, social proof (live DB count) |
| Paste Text tab | PASS | Toggle works, text input, email validation |
| Upload PDF tab | PASS | Drag zone, file validation info displayed |
| Roast API | BUG | API returns 200 but takes ~30s — client timeout race |
| Timeout/Retry UI | PASS | "Try Again" + "Change resume" buttons work |
| /templates | PASS | 5 template cards, $29 CTA, FAQ section |
| /rewrite | PASS | Pricing cards ($99/$199), booking form with PDF, FAQ |
| /auth/signin | PASS | Google OAuth + magic link + "Continue without" |
| /dashboard | PASS | Redirects to sign-in (requires auth) |
| /roast/[id] permalink | PASS | Score, rating widget, top issues, ATS, upsell, cross-sell, share |
| Rating widget | PASS | Thumbs up/down via API, stores in DB |
| Share buttons | PASS | X, LinkedIn, Copy Link visible on results |
| OG image API | PASS | Returns PNG, cache headers present |
| OG meta tags | PASS | og:title, og:image, twitter:card on permalinks |
| /api/stats | PASS | Returns live counts (totalRoasts, avgRating) |
| /api/admin/* | BUG | 401 — AUTH_SECRET and ADMIN_TOKEN missing from .env.local |
| /admin | PASS | Redirects when not authenticated (correct behavior) |
| Header navigation | PASS | Templates, Rewrite, Sign In links work |
| Social proof | PASS | Live count from DB ("5 resumes roasted") |
| Loading skeleton | PASS | Shown on /roast/[id] during load |
| ErrorBoundary | PASS | Wrapped in layout |

---

## Bugs Found

### BUG-1: Client Timeout Race Condition (Critical)
**Severity:** Critical  
**Page:** Landing page → Roast submit  
**Steps:** Paste text + email → click "Roast My Resume" → wait  
**Expected:** Results page  
**Actual:** "The roast is taking longer than expected" timeout screen  
**Root cause:** MiniMax M2.5 API responds in ~28-30s. Client AbortController timeout is 30s. Race condition — timeout often fires before response arrives.  
**Fix:** Increase client timeout to 60s in ResumeUpload.tsx.

### BUG-2: Auth MissingSecret Error (Medium)
**Severity:** Medium  
**Page:** All pages (console error)  
**Steps:** Load any page → check Docker logs  
**Expected:** No auth errors  
**Actual:** `[auth][error] MissingSecret: Please define a 'secret'` on every page load  
**Root cause:** `AUTH_SECRET` not set in `.env.local`. Auth.js v5 requires it even when not using auth features.  
**Fix:** Generate AUTH_SECRET and add to `.env.local`: `openssl rand -base64 32`

### BUG-3: Admin API Returns 401 Even With Token (Medium)
**Severity:** Medium  
**Page:** /api/admin/stats, /api/admin/emails, /api/admin/orders  
**Steps:** `curl -H "Authorization: Bearer <token>" http://localhost:8601/api/admin/stats`  
**Expected:** Admin stats  
**Actual:** `{"error": "Unauthorized"}`  
**Root cause:** `ADMIN_TOKEN` not set in `.env.local`. Also, `auth()` call in `isAdminAuthorized()` throws MissingSecret exception before reaching token check.  
**Fix:** 1) Add ADMIN_TOKEN to .env.local. 2) Wrap `auth()` call in try/catch so token fallback still works when AUTH_SECRET is missing.

### BUG-4: /api/health Endpoint Missing (Low)
**Severity:** Low  
**Steps:** `curl http://localhost:8601/api/health`  
**Expected:** 200 OK  
**Actual:** 404  
**Root cause:** Health check endpoint was in Sprint 14 (Deploy) plan but never created.  
**Fix:** Create simple GET /api/health route returning `{ status: "ok", timestamp: Date.now() }`

---

## Configuration Issues (Not Bugs)

| Issue | Status | Action Needed |
|-------|--------|---------------|
| AUTH_SECRET missing | Config | `openssl rand -base64 32` → .env.local |
| ADMIN_TOKEN missing | Config | Set any secure token → .env.local |
| GOOGLE_CLIENT_ID/SECRET missing | Config | Create Google OAuth app → .env.local |
| RESEND_API_KEY missing | Config | Create Resend account → .env.local |
| STRIPE_PRICE_TEMPLATES missing | Config | Create Stripe product → .env.local |
| STRIPE_PRICE_REWRITE_* missing | Config | Create Stripe products → .env.local |

---

## Test Coverage

- **Unit tests:** 177/177 passing
- **E2E tests:** 54/54 passing
- **Manual smoke test:** 21 areas checked, 4 bugs found
