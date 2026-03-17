# Bug Fix Sprint Plan

**Date:** 2026-03-16
**Source:** [Smoke Test Report](./smoke-test-report.md)
**Issues:** GitHub #18–#21

---

## BUG-1: Client Timeout Race Condition (Critical) — #18

**File:** `src/components/ResumeUpload.tsx` (line 15)

**Current code:**
```ts
const ROAST_TIMEOUT_MS = 30_000;
```

**Change:** Increase timeout constant to 60 seconds:
```ts
const ROAST_TIMEOUT_MS = 60_000;
```

**Why:** MiniMax M2.5 API responds in ~28-30s. With a 30s AbortController timeout, the client races the API — timeout often fires before the response arrives, showing users a false "taking longer than expected" screen.

**Test cases:**
1. **Unit test:** Verify `ROAST_TIMEOUT_MS` equals `60_000` (import or read the constant).
2. **E2E test:** Submit a roast via paste text → confirm results page loads without timeout screen (`e2e/roast-flow.spec.ts` mocks the API and is unaffected by this change).
3. **Manual:** Paste text + email → "Roast My Resume" → wait up to 35s → should see results, not timeout UI.

**⚠ Required E2E fix:** `e2e/error-handling.spec.ts` has two timeout tests (lines 84–112, 114–137) that hang the API mock and wait `timeout: 40000` (40s) for the timeout UI. After this change the timeout fires at 60s, so those Playwright assertions will fail. Update both `toBeVisible({ timeout: 40000 })` calls to `toBeVisible({ timeout: 70000 })` (60s timeout + 10s buffer).

---

## BUG-2: AUTH_SECRET Missing from .env.example (Medium) — #19

**File:** `.env.example` (line 30)

**Current code:**
```env
AUTH_SECRET=  # Generate with: npx auth secret
```

**Change:** Update the comment to include the `openssl` one-liner (more portable than npx for Docker setups):
```env
AUTH_SECRET=  # REQUIRED — generate with: openssl rand -base64 32
```

**Why:** The existing comment says `npx auth secret` but doesn't make it clear that this value is **required** for the app to start without errors. Auth.js v5 throws `MissingSecret` on every request if unset.

**Test cases:**
1. **Grep test:** Confirm `.env.example` contains `AUTH_SECRET=` with "REQUIRED" in the comment.
2. **Manual:** Fresh `cp .env.example .env.local` → generate secret → `docker compose up` → no `MissingSecret` errors in logs.

---

## BUG-3: Admin API 401 Even With Valid ADMIN_TOKEN (Medium) — #20

**File:** `src/lib/auth.ts` — `isAdminAuthorized()` function (lines 61-79)

**Current code:**
```ts
export async function isAdminAuthorized(req: NextRequest): Promise<boolean> {
  // Check session-based admin
  const session = await auth();
  if (session?.user && (session.user as { isAdmin?: boolean }).isAdmin) {
    return true;
  }

  // Fallback: ADMIN_TOKEN (for scripts/API access)
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === token;
  }

  const queryToken = req.nextUrl.searchParams.get("token");
  return queryToken === token;
}
```

**Change:** Wrap `auth()` in try/catch so that when `AUTH_SECRET` is missing, the MissingSecret exception doesn't prevent the ADMIN_TOKEN fallback from executing:
```ts
export async function isAdminAuthorized(req: NextRequest): Promise<boolean> {
  // Check session-based admin
  try {
    const session = await auth();
    if (session?.user && (session.user as { isAdmin?: boolean }).isAdmin) {
      return true;
    }
  } catch {
    // auth() throws MissingSecret when AUTH_SECRET is not set —
    // fall through to ADMIN_TOKEN check
  }

  // Fallback: ADMIN_TOKEN (for scripts/API access)
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === token;
  }

  const queryToken = req.nextUrl.searchParams.get("token");
  return queryToken === token;
}
```

**Why:** `auth()` throws `MissingSecret` when `AUTH_SECRET` is unset. This exception propagates before the function reaches the `ADMIN_TOKEN` check, so even a valid Bearer token gets a 401.

**Test cases:**
1. **Unit test (happy path):** Mock `auth()` to throw → set `ADMIN_TOKEN=test123` in env → call `isAdminAuthorized` with `Authorization: Bearer test123` header → returns `true`.
2. **Unit test (session admin):** Mock `auth()` to return `{ user: { isAdmin: true } }` → returns `true` without checking token.
3. **Unit test (no credentials):** Mock `auth()` to throw → no `ADMIN_TOKEN` env → returns `false`.
4. **Unit test (query token):** Mock `auth()` to throw → set `ADMIN_TOKEN=test123` → request with `?token=test123` → returns `true`.
5. **Manual:** Set `ADMIN_TOKEN=mysecret` in `.env.local` (no AUTH_SECRET) → `curl -H "Authorization: Bearer mysecret" localhost:3000/api/admin/stats` → 200 OK.

---

## BUG-4: /api/health Endpoint Missing (Low) — #21

**File to create:** `src/app/api/health/route.ts`

**Change:** Create a new Next.js App Router route handler:
```ts
export function GET() {
  return Response.json({ status: "ok", timestamp: Date.now() });
}
```

**Why:** Health check endpoint is needed for Docker/orchestrator liveness probes. Was planned for Sprint 14 but never implemented.

**Test cases:**
1. **Unit/integration test:** `GET /api/health` → status 200 → body has `{ status: "ok", timestamp: <number> }`.
2. **Unit test:** Verify response `Content-Type` is `application/json`.
3. **Unit test:** Verify `timestamp` is a recent epoch millisecond value (within last 5 seconds).
4. **Manual:** `curl http://localhost:3000/api/health` → `{"status":"ok","timestamp":1742...}`.

---

## Implementation Order

1. **BUG-1** — one-line constant change, highest severity
2. **BUG-3** — auth fix, unblocks admin API testing
3. **BUG-2** — .env.example documentation fix
4. **BUG-4** — new file, lowest risk

## Branch Strategy

Per AGENTS.md: single branch `fix/smoke-test-bugs` with one commit per bug, or one combined commit referencing all four issues.

---

## Validation: APPROVED

**Validated:** 2026-03-17
**Validator:** Claude (validation agent)

### Findings

| # | Question | Result |
|---|----------|--------|
| 1 | 60s timeout sufficient? | **Yes.** 2× the observed ~28-30s API response time. Env-var configurability is unnecessary for a bugfix sprint. |
| 2 | try/catch breaks auth when AUTH_SECRET IS set? | **No.** `auth()` returns normally (session or `null`) when configured — try/catch only catches exceptions. Existing unit tests (`auth.test.ts` lines 200-316) still pass. |
| 3 | .env.example change sufficient for BUG-2? | **Yes.** Documentation-only fix matching issue scope. Runtime fix is BUG-3. |
| 4 | /api/health interferes with existing routes? | **No.** Confirmed 19 existing routes under `api/admin/`, `api/auth/`, `api/checkout/`, `api/roast/`, `api/stats/`, `api/rewrite/`, `api/templates/`, `api/webhooks/` — no `api/health`. |
| 5 | Existing E2E tests break? | **YES — fixed in plan.** Two timeout tests in `e2e/error-handling.spec.ts` (lines 84-112, 114-137) wait only 40s for timeout UI that now fires at 60s. Added required Playwright timeout update to BUG-1 section. |
| 6 | Test cases sufficient? | **Yes**, with one correction: BUG-1 test case 2 referenced a nonexistent `test.slow()` roast flow test. `e2e/roast-flow.spec.ts` mocks the API and has no `test.slow()` — reference updated. |

### Plan corrections applied
1. BUG-1: Added required E2E fix for `e2e/error-handling.spec.ts` timeout assertions (`40000` → `70000`).
2. BUG-1: Removed stale `test.slow()` reference from test case 2.
