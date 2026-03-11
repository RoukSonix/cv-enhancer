# Project Status

**Last updated:** 2026-03-11

## Current State

### Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | Working | Fire theme, animations, feature pills |
| Paste Text input | Working | Textarea with validation |
| Upload PDF input | Working | Drag-drop UI, file picker |
| AI Roast (free tier) | Working | MiniMax M2.5 via OpenRouter |
| Loading animation | Working | Progress bar, rotating jokes |
| Results: Overall Score | Working | Animated ring, score badge (Dumpster Fire → Chef's Kiss) |
| Results: Summary | Working | AI-generated roast text |
| Results: Top Issues | Working | 3 numbered issues |
| Results: ATS Score | Working | Score bar + issues list |
| Results: First Impression | Working | Score, roast text, 3 tips |
| Results: Upsell blocks | Working | UI only, no payment logic |
| "Roast Another" button | Working | Resets to upload form |
| Docker dev setup | Working | `docker compose up -d` on port 3000 |

### Not Implemented (Stubs / Missing)

| Feature | Status | Priority |
|---------|--------|----------|
| Share Results | Stub (button exists, no onClick) | High |
| PDF Upload validation | Needs manual testing | Medium |
| Payments (Stripe/LemonSqueezy) | Not started | High |
| Full Roast (paid tier) | API supports it, UI doesn't trigger | High |
| Shareable results (/roast/[id]) | Not started | High |
| Database (persist results) | Not started | High |
| Email capture | Not started | Medium |
| Auth | Not started | Low |
| Deploy (Vercel) | Not started | Medium |
| Domain + DNS | Not started | Medium |
| OG images for social sharing | Not started | Medium |
| Template Pack page | Not started | Low |
| Rewrite Service page | Not started | Low |

### Known Issues

- "Share Results" button has no click handler
- "Get Full Roast — $9.99" button has no click handler
- "Resume Template Pack — $29" button has no click handler
- "Professional Rewrite — $99" button has no click handler
- No error toast/notification on API failure (only inline text)
- Social proof numbers are hardcoded ("1,200+ resumes roasted")
- No favicon customization (uses default Next.js)

## Tech Stack

- **Framework:** Next.js 16.1.6 (Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + tw-animate-css
- **UI Components:** shadcn/ui (Radix UI)
- **Icons:** Lucide React
- **AI:** OpenRouter API (MiniMax M2.5) via OpenAI SDK
- **PDF Parsing:** pdf-parse
- **Runtime:** Node.js 22 (Alpine Docker)
- **Container:** Docker Compose

## Architecture

```
src/
├── app/
│   ├── api/roast/route.ts    # POST endpoint: PDF/text → AI roast
│   ├── layout.tsx             # Root layout (dark theme, Geist fonts)
│   ├── page.tsx               # Main page (landing + results)
│   └── globals.css            # Global styles, fire theme
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── AnimatedScore.tsx      # Animated score ring
│   ├── FireParticles.tsx      # Background fire particles
│   ├── LoadingRoast.tsx       # Loading state with jokes
│   ├── ResumeUpload.tsx       # Upload/paste form
│   └── RoastResults.tsx       # Results display
└── lib/
    ├── openrouter.ts          # OpenRouter client config
    ├── prompt.ts              # Free/paid roast prompts
    ├── types.ts               # TypeScript interfaces
    └── utils.ts               # Utility functions
```
