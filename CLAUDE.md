# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project
Job Autofill: a Chrome MV3 extension + local Fastify server that reads job application forms on any site and fills them with LLM reasoning over the user's resume and answer bank. The user always reviews and submits manually.

**Full spec: `docs/SPEC.md`. Read the relevant section before implementing anything.** Build in milestone order (SPEC §16); don't start a milestone before the previous one's acceptance criteria pass.

## Hard rules (never violate)
1. **Never auto-submit.** No code may click elements matching `/submit|apply|send application/i`. Keep the guard in `apps/extension/src/fill/` covered by a test.
2. **Never fabricate user data.** Unknown → `value: null` with a `note`. Option fields must use an exact provided option.
3. **API key only in `apps/server/.env`.** Never import the Anthropic SDK in the extension.
4. **No raw HTML to the LLM.** Only compact `FieldRecord`s.
5. **No real personal data in the repo.** Fixtures use `tests/fixtures/profile.fake.json`. Never commit `.env`, `*.db`, `data/`.
6. **Model IDs come from config/env**, never hardcoded in logic.
7. No CAPTCHA solving or bot-detection evasion; pause and hand control to the user.

## Stack
TypeScript strict · pnpm workspaces · WXT + React + Tailwind (extension) · Fastify + better-sqlite3 + Drizzle (server) · zod in `packages/shared` · `@anthropic-ai/sdk` with tool-use structured output · Vitest · Playwright.

## Layout
- `apps/extension/` — `entrypoints/` (background, content, sidepanel), `src/extract`, `src/fill`, `src/adapters`, `src/jd`, `src/steps`
- `apps/server/` — `src/routes`, `src/llm` (prompts + tool schemas), `src/db`, `src/cache`
- `packages/shared/` — zod schemas; **the single source of truth for types**. Change types here first.
- `tests/fixtures/<name>/` — 10–15 diverse saved real forms (careers pages, embedded iframes, Workday, Naukri, LinkedIn, plain HTML) + `expected.json`; scrubbed of personal data
- Generic engine first: ATS adapters are fallbacks, added only when a fixture fails (SPEC §10)

## Commands
```
pnpm install
pnpm dev              # extension (WXT) + server in parallel
pnpm dev:ext | pnpm dev:server
pnpm build
pnpm test             # vitest unit tests
pnpm test:e2e         # playwright against fixtures
pnpm eval             # LLM mapping evals (hits real API; not in CI)
pnpm lint && pnpm typecheck
pnpm db:migrate
```
If a command doesn't exist yet, add it to the root `package.json` when building the relevant milestone.

## Conventions
- Small pure functions in `extract/` and `fill/`; DOM access isolated so logic is unit-testable with happy-dom.
- Every new field type, widget driver, or adapter ships with a fixture-based test.
- Validate every LLM response with zod; on failure retry once with the error appended.
- Messages between extension contexts use the typed contracts in `apps/extension/src/messaging.ts`.
- Log counts and field signatures, not personal values.
- Keep prompts in `apps/server/src/llm/prompts.ts`; run `pnpm eval` after changing them.

## Workflow
1. Read the spec section for the task.
2. Write or update the zod schema in `packages/shared` if data shapes change.
3. Implement with tests.
4. Run `pnpm lint && pnpm typecheck && pnpm test` before declaring done.
5. Update `docs/SPEC.md` if behavior deliberately differs from the spec, and note it in the commit message.
