# CV Enhancer (Resume Roaster)

AI-powered resume critique with a brutally honest "roast" personality. Upload a PDF or paste text, get scored 0-100 with actionable feedback.

## Quick Start

```bash
# 1. Copy env and add your OpenRouter API key
cp .env.example .env.local

# 2. Run with Docker
docker compose up -d

# 3. Open http://localhost:3000
```

## Tech Stack

- Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui
- AI: OpenRouter (MiniMax M2.5) via OpenAI SDK
- PDF parsing: pdf-parse
- Docker Compose for dev/prod

## Documentation

All docs live in [`docs/`](./docs/):
- [`STATUS.md`](./docs/STATUS.md) — current project state and known issues
- [`PLAN.md`](./docs/PLAN.md) — product roadmap and revenue targets
- [`RESEARCH.md`](./docs/RESEARCH.md) — market research and competitive analysis

## Repository

- **GitHub:** https://github.com/RoukSonix/cv-enhancer
- **Issues:** All bugs and tasks tracked as GitHub Issues

---

## Development Workflow

**All development is done through ACP agents. Do not write code directly.**

### Iteration Cycle

Every task follows this 4-step pipeline:

#### Step 1: Planning (Claude)
- Agent receives the task description
- Agent creates a detailed implementation plan
- Plan is saved to a file or issue comment
- Agent finishes

#### Step 2: Plan Validation (Claude)
- A **separate** agent reviews the plan
- Simulates the implementation mentally to find potential issues
- If problems found → fixes the plan
- Agent finishes

#### Step 3: Implementation (Claude)
- Agent implements the task according to the validated plan
- Updates project documentation (`docs/STATUS.md`) after changes
- Commits with descriptive message
- Agent finishes

#### Step 4: Testing (Codex)
- If UI changes were made: agent tests functionality using the `playwright-interactive` skill
- Verifies the feature works as expected in the browser
- If bugs found → creates GitHub Issues

### Rules

1. **All bugs found during testing → create GitHub Issues** in this repository
2. **Test coverage must be >80%** — write tests for all new logic
3. **Update `docs/STATUS.md`** after every feature/fix
4. **Work in branches** — never commit directly to `main`
5. **One task = one branch = one PR**

### Branch Naming

```
feat/<short-description>    # New features
fix/<short-description>     # Bug fixes
docs/<short-description>    # Documentation only
test/<short-description>    # Test additions
```
