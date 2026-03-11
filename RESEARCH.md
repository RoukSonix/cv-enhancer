# Idea Analysis: Resume Roaster

**Original Idea:** AI-powered resume critique with "roast" personality  
**Source:** README.md, Selected as primary product  
**Status:** MVP in progress  

---

## 1. Problem Validation

### Problem Statement
Job seekers need feedback on their resumes but:
- Professional resume reviews cost $100-300
- Friends/family give generic feedback
- ATS systems reject resumes without explanation

### Target Audience
- Job seekers applying to tech companies
- Recent graduates updating resumes
- Career changers
- Anyone looking to improve their resume

### Market Size (TAM/SAM/SOM)
- **TAM:** All job seekers globally (~400M people change jobs annually)
- **SAM:** Tech job seekers in US/EU (~20M annually)
- **SOM:** Early adopters willing to try AI tools (~100K in first year)

---

## 2. Competitive Analysis

### Direct Competitors

| Competitor | Pricing | Strengths | Weaknesses |
|------------|---------|-----------|------------|
| Resume.io | $19-39/resume | Well-established, templates included | Generic feedback, not "roast" style |
| Kickresume | $15-25/month | Templates, AI writing | Subscription model, not one-time |
| Enhancv | $15/month | Beautiful templates | Not focused on critique |
| Resumaker.ai | $19.99 | AI-generated | Generic AI, no personality |
| Rezi | $19/month | ATS-focused | Subscription only |

### "Roast" Style Competitors (Differentiation)

| Competitor | What They Do | Relevance |
|------------|--------------|-----------|
| ResumeRoast.net | Manual resume roasts by professionals | Similar concept, manual = slower/expensive |
| RoastMyResume (TikTok) | Viral video roasts | Free, entertainment-focused |

### Unique Positioning
**Resume Roaster** = AI-powered + entertaining + affordable ($9.99) + shareable results

---

## 3. Product-Market Fit Indicators

### Strengths
- **Viral potential:** Entertaining "roast" format is shareable on social media
- **Low price point:** $9.99 reduces purchase friction
- **Clear value proposition:** Improve resume = get more interviews
- **Quick delivery:** Instant AI analysis vs days for human review

### Weaknesses
- **Trust:** Users may trust human review more than AI
- **Quality consistency:** AI output quality may vary
- **Market saturation:** Many resume tools exist

### Opportunities
- TikTok/Instagram Reels with funny roast examples (viral marketing)
- Cross-sell to template pack and rewrite service
- ATS optimization as differentiator

### Threats
- Large competitors with more resources
- Free alternatives (career services, university resources)
- AI quality may degrade with prompt leakage

---

## 4. Revenue Model

### Pricing Tiers

| Tier | Price | What's Included |
|------|-------|-----------------|
| Free | $0 | 1 basic roast (score + 3 issues), email required |
| Full Roast | $9.99 | Complete analysis + rewritten bullets + ATS check |
| Bundle | $24.99 | 3 full roasts |
| Upsell | - | Template pack ($29) + Rewrite ($99-199) |

### Revenue Targets (from PLAN.md)

| Product | Price | Target Sales | Revenue |
|---------|-------|-------------|---------|
| Free roasts | $0 | 200+ | $0 (leads) |
| Full Roast | $9.99 | 40-60 | $400-$600 |
| Bundle | $24.99 | 5-10 | $125-$250 |
| **Total** | | | **$525-$850** |

### Unit Economics
- **Cost per roast (AI):** ~$0.05-0.15 (GPT-4o API)
- **LemonSqueezy fees:** 5% + $0.50/transaction
- **Net margin per roast:** ~$8-9

---

## 5. Implementation Complexity

### Technical Stack
- **Frontend:** Next.js + Tailwind + shadcn/ui
- **Backend:** Next.js API routes
- **AI:** OpenAI GPT-4o
- **PDF parsing:** pdf-parse / pdf.js
- **Payments:** LemonSqueezy

### Development Time (from PLAN.md)
- **MVP:** 12-18 hours
- **Launch-ready:** 24-30 hours (with payments, email, sharing)

### Key Technical Challenges
1. **PDF parsing:** Different formats may not parse correctly
2. **Prompt engineering:** Consistent "roast" personality + accurate feedback
3. **Shareable results:** OG images for social sharing
4. **Payment integration:** LemonSqueezy setup and webhooks

---

## 6. Marketing Strategy

### Distribution Channels

| Channel | Expected Impact | Effort |
|---------|---------------|--------|
| Product Hunt | High (2-5K visitors) | Medium |
| TikTok Reels | Very High (viral potential) | Low-Medium |
| Reddit r/resumes | Medium (targeted) | Low |
| Twitter #buildinpublic | Low-Medium (no existing following) | High |
| Indie Hackers | Medium | Low |

### Launch Tactics
- Post funny roast examples on TikTok/Instagram before launch
- Product Hunt launch on Day 4
- Reddit posts in r/resumes, r/jobs, r/cscareerquestions
- Twitter thread with before/after examples

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low traffic | Medium | High | Multi-channel launch |
| AI quality inconsistent | High | Medium | Prompt engineering + human review |
| PDF parsing fails | Medium | Medium | Fallback to plain text paste |
| Payment issues | Low | Medium | Stripe backup |
| No sales | Medium | High | Have fallback: freelance services |

---

## 8. Additional Ideas to Explore

### Related Products
1. **Cover Letter Roaster** - Same concept for cover letters
2. **LinkedIn Profile Roaster** - LinkedIn optimization
3. **Interview Question Generator** - Practice questions based on resume
4. **Salary Negotiation Calculator** - Market rate based on resume

### Competitors in These Spaces
- **Cover letter:** Kickresume, Resume.io (similar competitors)
- **LinkedIn:** LinkedIn Profile Optimizer, Fiverr services
- **Interview prep:** Pramp, Interviewing.io (live practice)

### Recommendation
Start with Resume Roaster only. Add related products after validation.

---

## 9. Verdict

### Score: 8/10

| Criteria | Score |
|----------|-------|
| Problem clarity | 9/10 |
| Market demand | 8/10 |
| Competition | 6/10 (crowded but differentiateable) |
| Feasibility | 9/10 |
| Viral potential | 9/10 |
| Revenue potential | 7/10 |

### Recommendation
**PROCEED** - Strong concept with clear differentiation ("roast" personality). Viral potential through social media. Low development time (12-18 hours). Affordable price point ($9.99) encourages impulse purchases.

### Next Steps
1. Build MVP (focus on core roast feature only)
2. Create 3-5 funny example roasts for marketing
3. Set up TikTok account and start posting
4. Launch on Product Hunt + Reddit

---

*Generated: 2026-02-14*
*Source: RESEARCH.md, PLAN.md*
