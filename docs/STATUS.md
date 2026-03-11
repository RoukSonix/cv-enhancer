# Project Status

**Last updated:** 2026-03-11 (Sprint 1)

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
| Share Results | **Working** — generates `/roast?r=<encoded>` share link with OG meta tags | Done |
| PDF Upload validation | Needs manual testing | Medium |
| Payments (Stripe/LemonSqueezy) | Not started | High |
| Full Roast (paid tier) | API supports it, UI doesn't trigger | High |
| Shareable results (query-param encoded) | **Done** (Sprint 1 — `/roast?r=` with lz-string) | Done |
| Database (persist results) | Not started | High |
| Email capture | Not started | Medium |
| Auth | Not started | Low |
| Deploy (Vercel) | Not started | Medium |
| Domain + DNS | Not started | Medium |
| OG images for social sharing | Not started | Medium |
| Template Pack page | Not started | Low |
| Rewrite Service page | Not started | Low |

### Implemented (Sprint 1)

- Shareable roast results via URL-encoded query params (`/roast?r=<lz-string>`)
- OG meta tags (og:title, og:description, twitter:card) on shared results page
- `src/lib/share.ts`: encode/decode/buildShareUrl with lz-string compression and key minification
- `src/app/roast/page.tsx`: server component with `generateMetadata` and error states
- `src/components/SharedRoastView.tsx`: client wrapper with "Get your own roast" CTA
- Share button on main page now generates proper share URLs
- Vitest test suite with 14 unit tests (encoding round-trips, validation, edge cases)
- Schema versioning (`v: 1`) for future backwards compatibility

### Fixed (Sprint 0)

- "Share Results" button now copies URL to clipboard + shows toast (#1)
- "Get Full Roast — $9.99" button shows "Coming soon!" toast (#2)
- "Resume Template Pack — $29" button shows "Coming soon!" toast (#2)
- "Professional Rewrite — $99" button shows "Coming soon!" toast (#2)
- Social proof numbers replaced with honest value props ("Free instant feedback", "No signup required") (#3)
- Added `sonner` toast library via shadcn/ui (`<Toaster />` in root layout)

### Known Issues

- No error toast/notification on API failure (only inline text)
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
│   ├── roast/page.tsx         # Shared results page + OG meta tags (Sprint 1)
│   ├── layout.tsx             # Root layout (dark theme, Geist fonts)
│   ├── page.tsx               # Main page (landing + results)
│   └── globals.css            # Global styles, fire theme
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── AnimatedScore.tsx      # Animated score ring
│   ├── FireParticles.tsx      # Background fire particles
│   ├── LoadingRoast.tsx       # Loading state with jokes
│   ├── ResumeUpload.tsx       # Upload/paste form
│   ├── RoastResults.tsx       # Results display
│   └── SharedRoastView.tsx    # Client wrapper for shared results (Sprint 1)
└── lib/
    ├── __tests__/share.test.ts # Unit tests for share encoding/decoding
    ├── openrouter.ts          # OpenRouter client config
    ├── prompt.ts              # Free/paid roast prompts
    ├── share.ts               # Share URL encode/decode utilities (Sprint 1)
    ├── types.ts               # TypeScript interfaces
    └── utils.ts               # Utility functions
```
