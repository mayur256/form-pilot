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
Load `apps/extension/.output/chrome-mv3` as an unpacked extension (`chrome://extensions` → Developer mode → Load unpacked). Open the side panel, paste the server token printed in the terminal, upload your resume, and fill in the answer bank.

## Supported platforms
Generic engine works on most forms. Dedicated adapters (in progress): Greenhouse, Lever, Ashby, Workday, iCIMS, SmartRecruiters, LinkedIn Easy Apply, Naukri, Taleo, SuccessFactors.

## Privacy
Everything runs locally. Your resume, profile and answers never leave your machine except as the minimal context sent to the Anthropic API for each fill.

## Docs
- `docs/SPEC.md` — full technical specification and milestones
- `CLAUDE.md` — guidance for Claude Code
