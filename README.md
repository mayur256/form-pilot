# Job Autofill

An LLM-powered Chrome extension that reads job application forms on any site and fills them from your resume and a personal answer bank. You review every value and click Submit yourself.

## How it works
1. A local server parses your resume (PDF) into a structured profile and stores your answer bank (notice period, CTC, relocation, etc.) in SQLite.
2. On an application page, the extension scans every form field (including iframes and shadow DOM) and scrapes the job description.
3. The server asks Claude to map fields to your data, drafts tailored free-text answers, and returns a fill plan with confidence scores.
4. The extension fills the form, highlights low-confidence or missing fields, and learns from your corrections.

## Quick start
```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # add ANTHROPIC_API_KEY
pnpm db:migrate
pnpm dev
```
Load `apps/extension/.output/chrome-mv3-dev` (from `pnpm dev`) or `apps/extension/.output/chrome-mv3` (from `pnpm build`) as an unpacked extension (`chrome://extensions` → Developer mode → Load unpacked). It loads into your real Chrome profile, not a throwaway one. Open the side panel (toolbar icon or `Alt+Shift+F`), paste the server token (printed when the server starts; also saved at `apps/server/data/token`), upload your resume, and fill in the answer bank.

> Status: milestone M0 (scaffold). `pnpm db:migrate`, `pnpm test:e2e` and `pnpm eval` are placeholders until M1/M3. See `docs/TASKS.md`.

## Supported platforms
Generic engine works on most forms. Dedicated adapters (in progress): Greenhouse, Lever, Ashby, Workday, iCIMS, SmartRecruiters, LinkedIn Easy Apply, Naukri, Taleo, SuccessFactors.

## Privacy
Everything runs locally. Your resume, profile and answers never leave your machine except as the minimal context sent to the Anthropic API for each fill.

## Docs
- `docs/SPEC.md` — full technical specification and milestones
- `CLAUDE.md` — guidance for Claude Code
