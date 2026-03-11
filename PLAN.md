# Resume Roaster -- Hybrid Approach Plan

## Concept

Three interconnected products targeting one audience (job seekers):

1. **Resume Roaster** -- AI-powered resume critique with "roast" personality ($9.99/roast)
2. **Resume Template Pack** -- Professional resume templates ($19-$29)
3. **Resume Rewrite Service** -- Done-for-you resume rewrite ($99-$199)

Cross-sell flow: Free roast -> paid detailed roast -> template pack upsell -> rewrite service for those who want "done for me"

---

## Product 1: Resume Roaster (AI Tool)

### Core Features (MVP)
- Upload resume (PDF)
- AI generates harsh but helpful critique:
  - Overall score (0-100)
  - Section-by-section breakdown (experience, skills, education, formatting)
  - ATS compatibility check (keyword analysis)
  - Rewritten bullet points (top 3)
  - Specific improvement tips
- Shareable results page (viral loop)
- Payment via Stripe/LemonSqueezy

### Monetization
- **Free tier:** 1 basic roast (score + 3 top issues, requires email)
- **Full Roast:** $9.99 -- complete analysis + rewritten bullets + ATS check
- **Bundle:** $24.99 -- 3 full roasts
- **Upsell:** link to template pack and rewrite service on results page

### Tech Stack
- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes
- **AI:** OpenAI GPT-4o API (or Claude API)
- **PDF parsing:** pdf-parse / pdf.js
- **Payments:** LemonSqueezy (handles taxes, fast setup)
- **Hosting:** Vercel (free tier sufficient for launch)
- **Analytics:** Plausible or PostHog (free tier)
- **Email capture:** Resend or built-in LemonSqueezy

### Pages
1. `/` -- Landing page (headline, demo, pricing, CTA)
2. `/roast` -- Upload page + payment flow
3. `/roast/[id]` -- Results page (shareable)
4. `/templates` -- Template pack sales page (links to Gumroad/LemonSqueezy)
5. `/rewrite` -- Rewrite service page (Calendly or form)

---

## Product 2: Resume Template Pack

### What to Create
- 5 resume templates in multiple formats:
  - Google Docs (most accessible)
  - DOCX (Word)
  - Figma (for designers)
- Styles: Modern Minimal, Corporate Professional, Creative Bold, Tech/Developer, ATS-Optimized
- Each template includes:
  - Cover letter template
  - Instructions/tips document

### Monetization
- Single template: $9
- Full pack (5 templates): $29
- Sell on Gumroad (fast setup, built-in audience)
- Cross-sell from Resume Roaster results page

### Production
- Can be created with Figma + exported to Docs/DOCX
- 4-6 hours total work

---

## Product 3: Resume Rewrite Service

### What to Offer
- Full resume rewrite by "expert" (AI-assisted + human review)
- 48-hour turnaround
- Includes ATS optimization
- 1 round of revisions

### Monetization
- Basic rewrite: $99
- Premium (resume + cover letter + LinkedIn summary): $199
- Sell via Calendly booking + Stripe payment link
- Cross-sell from Roaster results page ("Want us to fix it for you?")

### Workflow
- Client uploads resume via form
- AI generates draft rewrite
- Human review and polish (30-60 min per resume)
- Deliver via email

---

## 7-Day Timeline

### Day 1 (Feb 10 -- today) -- [Issue #1](https://github.com/RoukSonix/money-maker/issues/1)
- [x] Choose idea and plan
- [ ] Set up Next.js project with Tailwind + shadcn/ui
- [ ] Build PDF upload + parsing
- [ ] Build AI roast engine (prompt engineering)
- [ ] Build results page (basic)

### Day 2 (Feb 11) -- [Issue #2](https://github.com/RoukSonix/money-maker/issues/2)
- [ ] Build landing page (conversion-optimized)
- [ ] Integrate LemonSqueezy payments
- [ ] Add email capture (free tier)
- [ ] Add shareable results page (OG images for social)
- [ ] Deploy to Vercel
- [ ] Buy domain (resumeroaster.com or similar)

### Day 3 (Feb 12) -- [Issue #3](https://github.com/RoukSonix/money-maker/issues/3)
- [ ] Create 5 resume templates (Google Docs + DOCX)
- [ ] Set up Gumroad store for templates
- [ ] Add template pack upsell to Roaster results page
- [ ] Set up rewrite service page + booking flow

### Day 4 (Feb 13) -- [Issue #4](https://github.com/RoukSonix/money-maker/issues/4)
- [ ] Prepare Product Hunt launch assets:
  - Logo, screenshots, demo video (Loom)
  - Tagline and description
  - First comment draft
- [ ] Write Reddit posts (3-5 subreddits)
- [ ] Create Twitter launch thread
- [ ] Test everything end-to-end

### Day 5 (Feb 14 -- LAUNCH) -- [Issue #5](https://github.com/RoukSonix/money-maker/issues/5)
- [ ] Launch on Product Hunt (12:01 AM PST)
- [ ] Post on Reddit: r/resumes, r/jobs, r/cscareerquestions
- [ ] Publish Twitter thread
- [ ] Post on Indie Hackers
- [ ] Respond to ALL comments within 10 min

### Day 6 (Feb 15) -- [Issue #6](https://github.com/RoukSonix/money-maker/issues/6)
- [ ] Continue Product Hunt engagement
- [ ] Post in LinkedIn groups
- [ ] Share in relevant Slack/Discord communities
- [ ] Iterate based on feedback
- [ ] Start fulfilling rewrite orders (if any)

### Day 7 (Feb 16) -- [Issue #7](https://github.com/RoukSonix/money-maker/issues/7)
- [ ] "Launch price ends tonight" urgency push
- [ ] Email all free-tier signups with discount
- [ ] Analyze metrics, double down on best channel
- [ ] Fulfill rewrite orders
- [ ] Revenue report

---

## Revenue Targets

| Product | Price | Target Sales | Revenue |
|---------|-------|-------------|---------|
| Free roasts (email capture) | $0 | 200+ | $0 (leads) |
| Full Roast | $9.99 | 40-60 | $400-$600 |
| Roast Bundle (3x) | $24.99 | 5-10 | $125-$250 |
| Template Pack | $29 | 5-10 | $145-$290 |
| Rewrite Service | $99-$199 | 1-3 | $99-$597 |
| **Total** | | | **$769-$1,737** |

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Low traffic on launch | Multi-channel launch (PH + Reddit + Twitter + IH) |
| AI output quality inconsistent | Extensive prompt engineering + human review of first 50 roasts |
| PDF parsing fails on some formats | Fallback: accept plain text paste |
| LemonSqueezy approval delays | Backup: Stripe payment links |
| Product Hunt flop | Reddit + Twitter as independent channels |
| No rewrite service orders | Focus on roast + templates (still $500-$800 potential) |

---

## Costs

| Item | Cost |
|------|------|
| Domain (.com) | ~$12 |
| OpenAI API (GPT-4o, ~500 roasts) | ~$15-$25 |
| Vercel hosting | $0 (free tier) |
| LemonSqueezy fees | 5% + $0.50/tx |
| Gumroad fees | 10% + $0.50/tx |
| **Total upfront** | **~$15-$40** |

---

## Success Metrics (End of Week)

- **Minimum success:** $500 revenue (covers Claude Code subscription + profit)
- **Target:** $1,000 revenue
- **Stretch:** $1,500+ revenue
- **Email list:** 200+ subscribers (asset for future products)
