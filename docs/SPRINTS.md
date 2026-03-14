# Sprint Plan

**Created:** 2026-03-11  
**Total sprints:** 16 (S0-S15)  
**Policy:** Zero bugs at sprint start — all bugs fixed before new features  
**Sprint duration:** 1-3 days each

---

## Sprint 0: Bug Fixes (Zero Bugs Policy) — COMPLETE

**Completed:** 2026-03-11 | **PR:** [#4](https://github.com/RoukSonix/cv-enhancer/pull/4)  
**Goal:** Fix all known bugs before starting new features. Policy: 0 bugs at sprint start.

**Issues:**
- [#1](https://github.com/RoukSonix/cv-enhancer/issues/1) Share Results button has no click handler
- [#2](https://github.com/RoukSonix/cv-enhancer/issues/2) Payment buttons have no click handlers
- [#3](https://github.com/RoukSonix/cv-enhancer/issues/3) Social proof numbers are hardcoded

**Tasks:**
- **#1:** Add onClick to Share Results → `navigator.clipboard.writeText()` with current page URL + toast notification "Link copied!"
- **#2:** Add onClick to all payment buttons → show toast "Coming soon!" (placeholder until Sprint 4)
- **#3:** Remove hardcoded numbers OR replace with honest text ("Join thousands of job seekers" or similar non-numeric)
- Add toast notification library (sonner)
- Write unit tests for any new logic

**Tech:** sonner (toast), clipboard API, React event handlers  
**Testing:** Click each button → verify correct behavior. No console errors.  
**Done when:** All 3 issues closed, 0 open bugs

---

## Sprint 1: Share Results — COMPLETE

**Completed:** 2026-03-11 | **PR:** [#5](https://github.com/RoukSonix/cv-enhancer/pull/5)

**Goal:** Users can copy a link to their roast results and share on social media.

**Tasks:**
- Wire up "Share Results" button with `navigator.clipboard.writeText()`
- Show toast/notification on copy ("Link copied!")
- For now, encode result as base64 in URL hash (no DB yet): `/roast?r=<encoded>`
- Create `/roast` page that decodes and renders results
- Add OG meta tags to shared page (title, description with score)

**Tech:** Next.js dynamic routes, URL encoding, clipboard API  
**Testing:** Verify copy works, open shared URL in incognito, check OG tags with `curl`  
**Done when:** User clicks Share → gets a URL → opening it shows the same results

---

## Sprint 2: Database & Persistent Results — COMPLETE

**Completed:** 2026-03-12 | **PR:** [#7](https://github.com/RoukSonix/cv-enhancer/pull/7)

**Goal:** Store roast results server-side so shared links are stable and don't expire.

**Tasks:**
- Add SQLite via Prisma (lightweight, no extra container)
- Schema: `Roast { id, resumeHash, tier, result (JSON), createdAt }`
- After AI response, save to DB and return `id`
- Create `/roast/[id]` page that fetches from DB
- Update Share to use `/roast/[id]` URL instead of base64
- Add API route `GET /api/roast/[id]` to fetch saved results

**Tech:** Prisma, SQLite, Next.js dynamic routes  
**Testing:** Create roast → check DB entry → open `/roast/[id]` → verify data matches  
**Done when:** Results persist across page refreshes and are accessible by unique URL

---

## Sprint 3: Paid Tier UI (Full Roast) — COMPLETE

**Completed:** 2026-03-12 | **PR:** [#8](https://github.com/RoukSonix/cv-enhancer/pull/8)

**Goal:** Display full roast results for paid users — all 5 sections, rewritten bullets.

**Tasks:**
- Create `RoastResultsFull.tsx` component with all 5 sections:
  - Format & Layout, Work Experience, Skills & Keywords, Education & Certs, Overall Impact
- Display rewritten bullets section (original → rewritten + explanation)
- Add tier indicator in results header ("Free Roast" vs "Full Roast")
- Wire "Get Full Roast" button to trigger paid flow (placeholder for now — marks as paid in state)
- Update API to accept tier param and return full analysis
- Lock full sections behind tier check

**Tech:** React components, conditional rendering, existing prompt.ts (paid tier already implemented)  
**Testing:** Submit with tier=paid via API → verify 5 sections + bullets render correctly  
**Done when:** Full roast displays all sections, free tier shows teaser with upsell

---

## Sprint 4: Payments (Stripe Integration) — COMPLETE

**Completed:** 2026-03-12 | **PR:** [#9](https://github.com/RoukSonix/cv-enhancer/pull/9)

**Goal:** Accept payments for Full Roast ($9.99) and Bundle ($24.99).

**Tasks:**
- Set up Stripe account and products/prices
- Create `POST /api/checkout` — generates Stripe Checkout session
- Create `/api/webhooks/stripe` — handles `checkout.session.completed`
- On successful payment: mark roast as "paid" in DB, unlock full results
- Wire "Get Full Roast — $9.99" button to checkout flow
- Wire "3 roasts for $24.99" to bundle checkout
- Add success/cancel redirect pages
- Store payment status in Roast model: `{ paid: boolean, stripeSessionId }`

**Tech:** Stripe Checkout, Stripe webhooks, Prisma  
**Testing:** Test with Stripe test mode, verify webhook fires, verify results unlock after payment  
**Done when:** User pays → redirected to full results → payment recorded in DB

---

## Sprint 5: Email Capture — COMPLETE

**Completed:** 2026-03-12 | **PR:** [#10](https://github.com/RoukSonix/cv-enhancer/pull/10)

**Goal:** Collect email before showing free roast results (lead generation).

**Tasks:**
- Add email input field before "Roast My Resume" button
- Validate email format client-side
- Store email in DB: `User { id, email, createdAt }` linked to Roast
- Send welcome email via Resend (or store for later)
- Add checkbox "Send me resume tips" (opt-in marketing)
- GDPR-friendly: clear consent text

**Tech:** Resend API (or queue for later), Prisma, email validation  
**Testing:** Submit without email → blocked. Submit with email → stored in DB → roast proceeds  
**Done when:** Every free roast requires email, emails stored for marketing

---

## Sprint 6: Error Handling & UX Polish — COMPLETE

**Completed:** 2026-03-12 | **PR:** [#11](https://github.com/RoukSonix/cv-enhancer/pull/11)

**Goal:** Robust error handling and polished user experience.

**Tasks:**
- Add toast notification system (sonner or react-hot-toast)
- Replace inline error text with toasts
- Handle API timeout gracefully (show retry button after 30s)
- Add file size validation (reject >5MB PDF before upload)
- Add PDF type validation (reject non-PDF files)
- Show file name + size after successful upload
- Add "Try again" button on error state
- Loading state: prevent double-submit
- Mobile responsiveness audit and fixes

**Tech:** sonner/react-hot-toast, form validation  
**Testing:** Test each error case: bad file type, oversized file, API timeout, network error  
**Done when:** All error states handled gracefully with visual feedback

---

## Sprint 7: OG Images & Social Sharing — COMPLETE

**Completed:** 2026-03-13 | **PR:** [#12](https://github.com/RoukSonix/cv-enhancer/pull/12)

**Goal:** Generate dynamic social preview images for shared roast results (viral loop).

**Tasks:**
- Create OG image template (score, badge, summary preview)
- Generate dynamic OG images using `@vercel/og` or `satori`
- Add `og:image` meta tag to `/roast/[id]` pages
- Twitter Card meta tags (summary_large_image)
- Test previews on Twitter, LinkedIn, Discord, Facebook
- Add "Share on Twitter" and "Share on LinkedIn" buttons with pre-filled text

**Tech:** @vercel/og or satori, Next.js metadata API  
**Testing:** Share URL on each platform → verify preview renders correctly  
**Done when:** Sharing a roast URL shows a rich preview with score and summary

---

## Sprint 8: PDF Upload E2E Testing — COMPLETE

**Completed:** 2026-03-14 | **PR:** [#13](https://github.com/RoukSonix/cv-enhancer/pull/13)

**Goal:** Ensure PDF upload works reliably with various resume formats.

**Tasks:**
- Write E2E tests for PDF upload flow
- Test with 10+ real-world resume PDFs (various formats, layouts, sizes)
- Test edge cases: encrypted PDF, image-only PDF, multi-page PDF, very large PDF
- Fix pdf-parse failures (add fallback: extract text via pdf.js if pdf-parse fails)
- Add text extraction quality check (if extracted text too short → ask user to paste instead)
- Show extracted text preview before roasting (optional)

**Tech:** Playwright, pdf-parse, pdf.js fallback  
**Testing:** Automated E2E tests + manual testing with diverse PDFs  
**Done when:** PDF upload works for 95%+ of real-world resumes

---

## Sprint 9: Analytics & Real Metrics

**Goal:** Track usage, replace hardcoded social proof with real data.

**Tasks:**
- Integrate PostHog or Plausible (free tier)
- Track events: page view, roast submitted, roast completed, payment started, payment completed
- Replace hardcoded "1,200+ resumes roasted" with real count from DB
- Replace "4.8 avg. satisfaction" with real rating (add thumbs up/down after results)
- Dashboard: total roasts, conversion rate (free → paid), revenue
- Add simple admin page or use PostHog dashboard

**Tech:** PostHog/Plausible, Prisma aggregation queries  
**Testing:** Verify events fire correctly, check dashboard shows accurate data  
**Done when:** Real metrics displayed on landing page, analytics dashboard accessible

---

## Sprint 10: Auth & User Accounts

**Goal:** Users can create accounts to access roast history and manage purchases.

**Tasks:**
- Add NextAuth.js with email magic link (or Google OAuth)
- User model in DB: `{ id, email, name, createdAt }`
- Link roasts to user accounts
- "My Roasts" page — history of all roasts
- Show purchase status per roast
- Login/signup flow on the site

**Tech:** NextAuth.js, Prisma, magic link or OAuth  
**Testing:** Sign up → roast → see in history → sign out → sign in → history still there  
**Done when:** Users can create accounts and see their roast history

---

## Sprint 11: Template Pack Sales Page

**Goal:** Sell resume template packs as additional revenue stream.

**Tasks:**
- Create `/templates` page with template previews
- 5 template styles: Modern Minimal, Corporate, Creative Bold, Tech/Developer, ATS-Optimized
- Create actual templates in Google Docs + DOCX format
- Stripe checkout for template pack ($29)
- Auto-deliver download link after payment (or email)
- Cross-sell from roast results page

**Tech:** Stripe, file hosting (S3 or Vercel Blob), Next.js pages  
**Testing:** Purchase flow → verify download link delivered → verify templates are correct  
**Done when:** Users can buy and download template packs

---

## Sprint 12: Rewrite Service Page

**Goal:** Offer done-for-you resume rewrite service ($99-$199).

**Tasks:**
- Create `/rewrite` page with service description and pricing
- Booking form: upload resume + select package + payment
- Stripe payment for rewrite service
- Email notification to admin on new order
- Order management: simple admin view or email-based workflow
- Delivery workflow: AI-assisted draft → human review → email to customer

**Tech:** Stripe, Resend (email), form handling  
**Testing:** Complete booking flow → verify payment → verify admin notification  
**Done when:** Users can book and pay for rewrite service

---

## Sprint 13: Marketing & Launch Prep

**Goal:** Prepare all assets for public launch.

**Tasks:**
- Product Hunt listing: logo, screenshots, description, first comment draft
- Create demo video (Loom or similar)
- Write Reddit posts for r/resumes, r/jobs, r/cscareerquestions
- Twitter/X launch thread with before/after examples
- Create 3-5 funny example roasts for social media content
- Indie Hackers post
- Set up social media accounts if needed

**Tech:** Content creation, social platforms  
**Testing:** Review all assets, get feedback before publishing  
**Done when:** All launch assets ready, scheduled posts prepared

---

## Sprint 14: Deploy (Production)

**Goal:** Application live on the internet with a custom domain.

**Tasks:**
- Production Dockerfile (multi-stage build, `next build` + `next start`)
- Update docker-compose with production profile
- Set up Hetzner VPS + Coolify
- Buy and configure domain on Cloudflare Registrar
- SSL certificate (auto via Coolify / Let's Encrypt)
- Environment variables in production (OpenRouter key, Stripe keys, DB)
- Health check endpoint `/api/health`
- Basic rate limiting on `/api/roast` (prevent abuse)

**Tech:** Docker multi-stage, Hetzner VPS, Coolify, DNS, SSL, rate limiting  
**Testing:** Deploy → verify all features work in production → test payment flow with Stripe test mode  
**Done when:** App accessible via custom domain, HTTPS, all features working

---

## Sprint 15: Launch & Iterate

**Goal:** Public launch and rapid iteration based on feedback.

**Tasks:**
- Launch on Product Hunt (12:01 AM PST on chosen day)
- Post on Reddit (3-5 subreddits)
- Publish Twitter thread
- Post on Indie Hackers
- Monitor analytics in real-time
- Respond to ALL comments within 10 minutes
- Hot-fix any issues that appear
- "Launch price ends tonight" urgency push on Day 2
- Email all free-tier signups with discount
- Week 1 revenue report

**Tech:** Social platforms, monitoring, quick deploys  
**Testing:** Monitor error logs, check payment flow under load  
**Done when:** Live, receiving traffic, first revenue recorded

---

## Sprint Priority Map

```
Critical Path (must have for launch):
  S0-S6 (done) → S14 (deploy) → S15 (launch)

Revenue enablers:
  S4 (payments, done) → S5 (email, done) → S11 (templates) → S12 (rewrite)

Growth:
  S7 (OG images) → S9 (analytics) → S13 (marketing)

Quality:
  S6 (UX polish, done) → S8 (PDF testing) → S10 (auth)
```

**Minimum viable launch:** S0-S6 (done) + S14 (Deploy) + S15 (Launch)
