# Sprint Retrospective Log

Problems, blockers, and lessons learned during sprint execution.

---

## Sprint 6: Error Handling & UX Polish (2026-03-12)

### Problems
- **Codex ACP first attempt stuck** — spawned Codex for testing, session showed no output after 20+ minutes. Had to kill and respawn. Root cause unclear — possibly ACP session didn't start properly.
- **Docker container name conflict** — Codex testing agent couldn't start Sprint 6 Docker because main cv-enhancer containers were already running with same names. Agent resolved by stopping main stack first, then restoring after tests.

### Lessons
- Always stop main Docker stack before running sprint worktree Docker
- Check ACP agent output within 5 minutes — if empty, respawn

---

## Sprint 7: OG Images & Social Sharing (2026-03-13)

### Problems
- **ACP backend unavailable** (06:05 UTC) — Codex ACP spawn returned "ACP runtime backend is currently unavailable". 2 retries failed. Ran tests manually instead.
- **Duplicate ShareButtons** — Implementation agent added ShareButtons to SharedRoastView AND RoastResults/RoastResultsFull. On shared pages both render, causing Playwright strict mode violations (2 elements with same testid). Fixed by removing from SharedRoastView.
- **Twitter/LinkedIn popup tests** — `window.open` with `noopener` doesn't reliably create interceptable popups in headless Chromium. Simplified tests to check button visibility+text instead of popup URL (URL correctness already covered by unit tests).
- **Copy Link clipboard flaky** — Headless Chromium clipboard permission issues. Test passes on retry. Known issue.

### Lessons
- When adding shared components to multiple parents, check for duplicate rendering on pages that compose multiple parent components
- Prefer unit tests for URL construction, E2E only for visibility/interaction
- ACP backend can go down — have manual fallback ready
