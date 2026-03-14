# Sprint 10: Auth & User Accounts — Plan

**Created:** 2026-03-14
**Goal:** Users can create accounts to access roast history and manage purchases.
**Policy:** Keep anonymous roasts working — auth is optional, not gated.

---

## Architecture Decisions

### Auth.js v5 (NextAuth.js)
- Use **Auth.js v5** (`next-auth@5`) — the current stable release for Next.js App Router
- **Session strategy: JWT** — stateless, no session table needed, works with single-server Docker deployment
- JWT stored in an HTTP-only cookie (`next-auth.session-token`)
- No separate session/account tables — Auth.js v5 with JWT strategy only needs a `User` table and an `Account` table (for OAuth provider linking)

### Providers
1. **Google OAuth** — lowest friction for most users, no email deliverability concerns
2. **Email magic link (Resend)** — for users without Google accounts; uses Resend API (already in the sprint roadmap, free tier = 3k emails/month)
- Magic link requires a `VerificationToken` model in Prisma for storing temporary tokens

### Why Not Credentials Provider?
- Password management adds complexity (hashing, reset flow, security surface)
- OAuth + magic link covers 95%+ of users with less code and better security
- Can add credentials later if needed

### Linking Existing Data
- Add nullable `userId` FK on `Roast` model — existing roasts stay `userId: null`
- On first sign-in, attempt to retroactively link existing roasts by matching `Roast.email` to the authenticated user's email (one-time migration per user, runs at sign-in)
- Anonymous roasts continue to work — no auth required to use the core product

---

## DB Schema Changes

### New Models

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  isAdmin       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  roasts        Roast[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Updated Roast Model

```prisma
model Roast {
  // ... all existing fields unchanged ...

  // Sprint 10: Auth link
  userId    String?
  user      User?   @relation(fields: [userId], references: [id])

  @@index([userId])
  // ... existing indexes unchanged ...
}
```

### Migration Strategy
- `prisma migrate dev --name add-auth-models` creates User, Account, VerificationToken, and adds nullable `userId` to Roast
- **No data migration needed** — existing roasts get `userId: null` by default (nullable FK)
- Retroactive linking happens at runtime: on sign-in callback, query `Roast WHERE email = user.email AND userId IS NULL` and set `userId`
- This is safe because email is already captured on Roast (Sprint 5) and is unique per user

---

## Auth Configuration

### `src/lib/auth.ts` — Auth.js config

```typescript
// Key configuration points:
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Resend({
      from: "Resume Roaster <noreply@resumeroaster.com>",
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Persist isAdmin and userId in JWT
      if (user) {
        token.userId = user.id;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      // Expose userId and isAdmin on the session object
      session.user.id = token.userId;
      session.user.isAdmin = token.isAdmin;
      return session;
    },
    async signIn({ user }) {
      // Retroactively link existing roasts by email
      if (user.email && user.id) {
        await prisma.roast.updateMany({
          where: { email: user.email, userId: null },
          data: { userId: user.id },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",  // Custom sign-in page
  },
});
```

### `src/app/api/auth/[...nextauth]/route.ts` — Route handler

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### Environment Variables (new)

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend (magic link)
RESEND_API_KEY=
AUTH_SECRET=  # `npx auth secret` to generate

# NextAuth
NEXTAUTH_URL=http://localhost:3000
```

---

## Page & Component Changes

### 1. Root Layout — `src/app/layout.tsx`

- Wrap children with `<SessionProvider>` from `next-auth/react`
- Add `<Header />` component (sticky top bar with logo + auth button)

### 2. Header Component — `src/components/Header.tsx` (new)

- Logo/brand on left ("Resume Roaster")
- Right side:
  - **Signed out:** "Sign In" button → redirects to `/auth/signin`
  - **Signed in:** User avatar/name + dropdown menu with:
    - "My Roasts" → `/dashboard`
    - "Admin" → `/admin` (only if `isAdmin`)
    - "Sign Out"
- Use `useSession()` from `next-auth/react` for auth state
- Render on all pages (added to layout)

### 3. Sign-In Page — `src/app/auth/signin/page.tsx` (new)

- Custom branded sign-in page (fire theme)
- "Sign in with Google" button (primary, prominent)
- "Or sign in with email" — email input + "Send magic link" button
- "Continue without signing in" link → back to home
- After sign-in, redirect to `callbackUrl` (defaults to `/`)

### 4. Dashboard Page — `src/app/dashboard/page.tsx` (new)

- **Route:** `/dashboard`
- **Auth required:** redirect to `/auth/signin?callbackUrl=/dashboard` if not signed in
- **Content:**
  - Page title: "My Roasts"
  - List of all roasts for the signed-in user, ordered by `createdAt` DESC
  - Each roast card shows:
    - Date (formatted)
    - Overall score (with score badge color)
    - Tier badge ("Free" / "Full Roast")
    - First ~80 chars of summary (truncated)
    - Link to `/roast/[id]`
  - Empty state: "No roasts yet. Roast your first resume!" with CTA to home

### 5. Main Page — `src/app/page.tsx`

- **No changes to core flow** — anonymous users can still roast without signing in
- The header (added via layout) will show Sign In / user menu on all pages

### 6. Roast API — `src/app/api/roast/route.ts`

- **Optional auth:** if user is signed in (check session via `auth()`), attach `userId` to the new Roast record
- If not signed in, `userId` remains null (backward compat)
- No changes to the roast flow itself

### 7. Admin Page — `src/app/admin/page.tsx`

- **Replace token-based auth** with proper role-based auth:
  - Use `auth()` server-side to get session
  - Check `session.user.isAdmin === true`
  - If not admin → show 403 or redirect to home
- Remove `?token=` query param auth from page
- Keep `ADMIN_TOKEN` on API routes as fallback for external/script access

### 8. Admin API Routes — `src/app/api/admin/stats/route.ts` & `emails/route.ts`

- **Dual auth:** accept either `ADMIN_TOKEN` (existing) OR valid session with `isAdmin: true`
- This allows both browser-based admin access (session) and script/API access (token)

---

## Optional: Bundle Credits Linked to User

### Current State
- Bundle credits tracked via `bundle_token` cookie
- Cookie is set on checkout success, read on credit redemption
- Problem: credits are lost if user clears cookies or switches devices

### Sprint 10 Enhancement
- When a signed-in user purchases a bundle, store `userId` on the Credit records
- When redeeming, check both cookie-based credits AND user-linked credits
- Migration: on sign-in, link existing credits by matching `Credit.stripeSessionId` to Roast records that share the user's email (best-effort)

### Schema Change (Credit model)

```prisma
model Credit {
  // ... existing fields ...
  userId    String?   // link to user account (Sprint 10)

  @@index([userId])
}
```

This is **optional** — implement only if time permits. Cookie-based flow continues to work.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Edit | Add User, Account, VerificationToken models; add `userId` FK to Roast |
| `src/lib/auth.ts` | Create | Auth.js v5 configuration (providers, callbacks, adapter) |
| `src/lib/auth-types.ts` | Create | TypeScript module augmentation for session types (userId, isAdmin) |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | Auth.js API route handler |
| `src/app/layout.tsx` | Edit | Add `<SessionProvider>` wrapper and `<Header />` component |
| `src/components/Header.tsx` | Create | Sticky header with logo, auth button, user menu |
| `src/app/auth/signin/page.tsx` | Create | Custom sign-in page (Google + magic link) |
| `src/app/dashboard/page.tsx` | Create | "My Roasts" history page |
| `src/components/RoastHistoryCard.tsx` | Create | Card component for dashboard roast list |
| `src/app/api/roast/route.ts` | Edit | Attach `userId` from session if signed in |
| `src/app/admin/page.tsx` | Edit | Replace token auth with session-based `isAdmin` check |
| `src/app/api/admin/stats/route.ts` | Edit | Add session-based admin auth alongside token |
| `src/app/api/admin/emails/route.ts` | Edit | Add session-based admin auth alongside token |
| `.env.example` | Edit | Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, AUTH_SECRET |
| `package.json` | Edit | Add `next-auth@5` and `@auth/prisma-adapter` dependencies |

---

## Implementation Order

1. **Dependencies** — install `next-auth@5`, `@auth/prisma-adapter`
2. **Schema migration** — add User, Account, VerificationToken models; add `userId` to Roast; run `prisma migrate dev`
3. **Auth config** — `src/lib/auth.ts` with Google + Resend providers, JWT callbacks
4. **Auth route handler** — `src/app/api/auth/[...nextauth]/route.ts`
5. **Type augmentation** — extend Session and JWT types for `userId` and `isAdmin`
6. **SessionProvider** — wrap layout with provider
7. **Header component** — sign in/out, user menu, nav links
8. **Sign-in page** — `/auth/signin` with Google + email options
9. **Roast API update** — optionally attach `userId` on roast creation
10. **Sign-in callback** — retroactive roast linking by email
11. **Dashboard page** — `/dashboard` with roast history list
12. **Admin page update** — replace token auth with `isAdmin` session check
13. **Admin API update** — dual auth (session + token)
14. **Tests** — unit + E2E
15. **Optional: Credit linking** — add `userId` to Credit model

---

## Test Cases

### Unit Tests

| # | Test | File |
|---|------|------|
| 1 | JWT callback includes userId and isAdmin | `src/lib/__tests__/auth.test.ts` |
| 2 | Session callback exposes userId and isAdmin | `src/lib/__tests__/auth.test.ts` |
| 3 | signIn callback links roasts by email | `src/lib/__tests__/auth.test.ts` |
| 4 | signIn callback doesn't link roasts with different email | `src/lib/__tests__/auth.test.ts` |
| 5 | signIn callback doesn't overwrite roasts already linked to another user | `src/lib/__tests__/auth.test.ts` |
| 6 | Admin auth helper: valid session with isAdmin → allowed | `src/lib/__tests__/auth.test.ts` |
| 7 | Admin auth helper: valid session without isAdmin → denied | `src/lib/__tests__/auth.test.ts` |
| 8 | Admin auth helper: ADMIN_TOKEN fallback works | `src/lib/__tests__/auth.test.ts` |

### E2E Tests

| # | Test | File |
|---|------|------|
| 1 | Sign-in page renders Google + email options | `e2e/auth.spec.ts` |
| 2 | "Continue without signing in" returns to home | `e2e/auth.spec.ts` |
| 3 | Header shows "Sign In" when not authenticated | `e2e/auth.spec.ts` |
| 4 | Header shows user name/avatar when authenticated | `e2e/auth.spec.ts` |
| 5 | `/dashboard` redirects to sign-in when not authenticated | `e2e/auth.spec.ts` |
| 6 | `/dashboard` shows roast history for authenticated user | `e2e/auth.spec.ts` |
| 7 | `/dashboard` empty state shown for new user | `e2e/auth.spec.ts` |
| 8 | Roast created while signed in appears in dashboard | `e2e/auth.spec.ts` |
| 9 | Anonymous roast still works (no auth required) | `e2e/auth.spec.ts` |
| 10 | `/admin` accessible to admin user, blocked for non-admin | `e2e/auth.spec.ts` |

---

## Out of Scope (Deferred)

- Password/credentials auth — OAuth + magic link is sufficient
- User profile editing — not needed for MVP
- Account deletion/GDPR data export — post-launch
- Multiple email addresses per account — Auth.js handles this via Account model
- Social login beyond Google (GitHub, Apple) — can add later by adding providers
- Credit linking to user accounts — optional stretch goal within this sprint

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Resend email deliverability (magic links) | Users can't sign in via email | Google OAuth as primary; Resend has good deliverability; monitor bounce rates |
| Auth.js v5 breaking changes | Build failures | Pin exact version; Auth.js v5 is stable as of 2026 |
| Retroactive roast linking matches wrong user | Data integrity | Only match on exact email + `userId IS NULL` — safe because email is unique per User |
| Header adding height affects existing layouts | Visual regression | Use sticky positioning with `z-50`; test all pages visually |
| E2E tests break with header added to all pages | CI failures | Update selectors if needed; header is additive (doesn't remove anything) |

---

## Validation: APPROVED

**Reviewed:** 2026-03-14 by validation agent

### Verdict: Plan is solid. Three minor fixes required before implementation.

### Fixes Applied to This Plan

#### Fix 1: Email Case Normalization (Critical)
Emails stored on Roast records are not lowercased (`email.trim()` only). Google OAuth returns lowercase emails, but magic link and user-entered emails may have mixed case, causing retroactive linking to silently fail.

**Action:** In the roast API (`src/app/api/roast/route.ts`), lowercase email before storing:
```typescript
const email = (formData.get("email") as string | null)?.trim().toLowerCase() || null;
```
And in the `signIn` callback, normalize before matching:
```typescript
const normalizedEmail = user.email?.toLowerCase();
if (normalizedEmail && user.id) {
  await prisma.roast.updateMany({
    where: { email: normalizedEmail, userId: null },
    data: { userId: user.id },
  });
}
```

#### Fix 2: Use `AUTH_URL` Instead of `NEXTAUTH_URL`
Auth.js v5 canonical env var is `AUTH_URL`, not `NEXTAUTH_URL`. Update the environment variables section:
```env
AUTH_URL=http://localhost:3000   # was NEXTAUTH_URL
```

#### Fix 3: Document Admin Bootstrapping
Add to implementation order (after step 3):
> After first admin signs in via Google/magic link, manually promote to admin:
> ```sql
> UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@resumeroaster.com';
> ```

### Validation Notes

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Auth.js v5 + Next.js 16 | PASS | Stable combo; verify `@auth/prisma-adapter` with Prisma 7.x `prisma-client` generator |
| 2 | JWT without session table | PASS | Adapter handles User/Account; JWT handles sessions — correct pattern |
| 3 | Auth.js schema models | PASS | User, Account, VerificationToken all match Auth.js v5 expected schema |
| 4 | Retroactive email linking | PASS (with Fix 1) | Logic is sound; email normalization needed to prevent silent mismatches |
| 5 | Admin `isAdmin` approach | PASS (with Fix 3) | JWT-based admin is fine at this scale; document bootstrapping |
| 6 | E2E test compatibility | PASS | All 8 specs use resilient selectors (getByRole, getByPlaceholder); SessionProvider returns null for anon — no breakage expected |
| 7 | Provider combo | PASS | Google + Resend is the right choice for consumer resume product |
| 8 | Migration strategy | PASS | Nullable FK + runtime linking is safe and zero-downtime |
