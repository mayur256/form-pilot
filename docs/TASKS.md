# Tasks

Status: `todo` · `doing` · `blocked` · `done` · `dropped`. Update status and the Evidence column in the same commit that finishes the task.
Milestones are strictly ordered; do not start one until the previous milestone's `audit/M*.md` is fully ticked and merged. Branch: `m<N>-<slug>`, one commit per task (D-012).
`Spec` = SPEC.md section. `Req` = REQUIREMENTS.md item / hard rule.

## Progress
| Milestone | Branch | Tasks done | Audit |
|---|---|---|---|
| M0 Scaffold | `m0-scaffold` | 0/8 | [M0](audit/M0.md) |
| M1 Profile + answer bank | `m1-profile` | 0/10 | [M1](audit/M1.md) |
| M2 Extraction | `m2-extraction` | 0/14 | [M2](audit/M2.md) |
| M3 Mapping + fill (MVP) | `m3-mapping-fill` | 0/13 | [M3](audit/M3.md) |
| M4 Hard widgets + multi-step | `m4-widgets-steps` | 0/8 | [M4](audit/M4.md) |
| M5 Learning + writing | `m5-learning` | 0/7 | [M5](audit/M5.md) |
| M6 Dashboard | `m6-dashboard` | 0/3 | [M6](audit/M6.md) |
| M7 Batch (optional) | `m7-batch` | 0/2 | [M7](audit/M7.md) |

## Owner-blocked inputs
| ID | Input | Blocks | Status |
|---|---|---|---|
| B-01 | `ANTHROPIC_API_KEY` in `apps/server/.env` | M1-04 | todo |
| B-02 | Real resume PDF (local only) | M1-04 manual check | todo |
| B-03 | 10–15 saved forms (list in REQUIREMENTS §6) | M2-12 | todo |
| B-04 | Answers for seeded keys | M3 manual runs | todo |
| B-05 | Token cap default values (tune after first measured runs) | M3-05 | todo |

---

## M0 — Scaffold
Goal: `pnpm dev` runs both apps and the panel shows server status. (Spec §16)

| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M0-01 | pnpm workspace root, strict `tsconfig.base`, verify `.gitignore` covers `.env`, `*.db`, `data/`; record Node/pnpm versions | §3, §4 | R5 | todo | |
| M0-02 | `packages/shared`: zod schemas + inferred types for Profile, Answer, FieldRecord (incl. §6.2.1 signals), FillDecision/FillPlan, Settings (incl. caps), sensitive-key constant | §5 | F4, F11, F13 | todo | |
| M0-03 | `apps/server`: Fastify, bind `127.0.0.1`, token generation + `X-Autofill-Token` hook, CORS to extension origin, `/health`, typed config loader (model IDs, port, data dir), `.env.example` | §13, §17 | R3, R6 | todo | |
| M0-04 | `apps/extension`: WXT MV3, background SW, side panel (React + Tailwind), minimal permissions, `Alt+Shift+F` command, toolbar-click opens panel | §11, §14 | | todo | |
| M0-05 | Panel: token entry (stored in `chrome.storage`), server status indicator | §11 | | todo | |
| M0-06 | ESLint + Prettier, Vitest, root scripts (`dev`, `dev:ext`, `dev:server`, `build`, `test`, `test:e2e`, `eval`, `lint`, `typecheck`, `db:migrate`) | CLAUDE.md | | todo | |
| M0-07 | CI workflow: lint + typecheck + unit tests | §16 | | todo | |
| M0-08 | Guard test: assert Anthropic SDK is not imported anywhere under `apps/extension` | §14 | R3 | todo | |

## M1 — Profile + answer bank
Goal: uploading a resume yields an editable profile that round-trips through SQLite.

| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M1-01 | Drizzle schema + migrations: `profile`, `answers`, `mapping_cache`, `corrections`, `applications`, `settings`; `pnpm db:migrate` | §5.6 | | todo | |
| M1-02 | `/settings` GET/PUT with defaults and zod validation; persists across restart | §13 | F13 | todo | |
| M1-03 | `/profile` GET/PUT; round-trip test against SQLite | §13 | F1 | todo | |
| M1-04 | `/profile/parse`: multipart PDF → Claude document block → Profile via tool-use + zod (retry once); store resume file, sha256 | §7.2, §13 | F1, R3 | todo | |
| M1-05 | `/profile/resume` serves resume bytes | §13 | | todo | |
| M1-06 | `/answers` CRUD + first-run seed of §5.2 keys (empty values) | §5.2 | F2 | todo | |
| M1-07 | LLM client wrapper: model IDs from config, zod-validate + one retry, token accounting, **cap enforcement** (per-app + per-day) with typed error | §7.2, §7.6 | R6, F13 | todo | |
| M1-08 | `tests/fixtures/profile.fake.json` + fake resume PDF | §14 | R5 | todo | |
| M1-09 | Panel: resume upload, profile editor, answer bank editor, settings form | §11 | F10 | todo | |
| M1-10 | Close M1: fill `audit/M1.md`, gate green, merge | | | todo | |

## M2 — Extraction
Goal: extractor ≥95% label accuracy on the mixed fixture set, all signals captured.

| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M2-01 | `messaging.ts` typed contracts (scan, fill, progress, errors) | CLAUDE.md | | todo | |
| M2-02 | On-demand injection via `activeTab` + `scripting` into all frames; background aggregates by `frameId` | §6.1, §14 | D-008 | todo | |
| M2-03 | DOM walker: open shadow roots, candidate selectors, visibility filter (file inputs exempt) | §6.1 | F3 | todo | |
| M2-04 | Grouping: radios by name/radiogroup, checkbox groups | §6.1 | | todo | |
| M2-05 | Label resolver (8-step chain) + normalization + required detection | §6.2 | | todo | |
| M2-06 | Signal collection: name, id, placeholder, autocomplete, allow-listed aria, section heading, helper text (all truncated) | §6.2.1 | F4 | todo | |
| M2-07 | Option extraction (select, radio, checkbox group); lazy options for comboboxes | §6.3 | | todo | |
| M2-08 | Signature hashing (include `autocomplete` + `name` per D-014) | §5.3 | | todo | |
| M2-09 | Element registry (`Map<fieldId, WeakRef<Element>>`); no selectors/HTML leave the content script | §6.4 | R4 | todo | |
| M2-10 | JD scraper (adapter → headings → largest block; ~6k chars; company/role) | §6.5 | | todo | |
| M2-11 | Panel: Scan / Re-scan, field list | §11 | F10 | todo | |
| M2-12 | **Fixture intake (blocked on B-03):** scrub script, per-fixture `expected.json`, README listing each fixture's category | §15 | R5, D-004 | blocked | |
| M2-13 | Fixture harness: happy-dom unit tests per helper + accuracy report across mixed set (≥95%) | §15 | | todo | |
| M2-14 | Flag closed shadow roots and uninjectable cross-origin iframes as "manual" | §18 | | todo | |

## M3 — Mapping + fill (MVP)
Goal: ≥90% correct fill on mixed set with generic engine only; no Submit click possible; values survive blur.

| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M3-01 | Rule pass: name/email/phone/URLs/file→resume via label + `autocomplete` + `name` tokens; `source: profile`, 0.99 | §7.1 | F5 | todo | |
| M3-02 | `/map` LLM pass: `prompts.ts`, `submit_fill_plan` tool schema, chunks of ~40, zod + retry once, prompt caching of static block | §7.1–7.3, §7.6 | R4 | todo | |
| M3-03 | Post-validation: option membership (exact → case-insens → fuzzy ≥0.85 → null), `maxLength`, required-null notes | §7.4 | R2, F6 | todo | |
| M3-04 | Sensitive-field handling: constant list forces amber regardless of confidence | §8.7 | F11 | todo | |
| M3-05 | Cap enforcement in `/map` with panel-visible error; caps in tokens (D-015); pick defaults by measuring typical runs | §7.6 | F13 | todo | |
| M3-06 | Filler: `setNativeValue` + typing fallback with read-back, select, radio/checkbox via `.click()`, file via `DataTransfer`, contenteditable | §8.1–8.6 | F7 | todo | |
| M3-07 | Fill rules: no overwrite w/o "Overwrite", 50–150 ms jitter, green/amber/red highlights, cleanup | §8.7 | | todo | |
| M3-08 | **No-submit guard** in `apps/extension/src/fill/` + test that no click can hit `/submit\|apply\|send application/i` | §8.7 | R1 | todo | |
| M3-09 | Review table: editable values, confidence badge, source chip, note, click-to-scroll/flash, edit writes to page | §11 | F10 | todo | |
| M3-10 | Settings wiring: `dryRun`, `confidenceThreshold`, `autoFillHighConfidence`, `fillEEO` | §5.5 | | todo | |
| M3-11 | Playwright harness: unpacked extension + fixture + mocked `/map`; assert DOM and post-blur state | §15 | | todo | |
| M3-12 | `pnpm eval`: eval cases `(fields, profile, answers) → expected decisions`, real API, not in CI | §15 | | todo | |
| M3-13 | Close M3: measure ≥90% on mixed set; fill `audit/M3.md`; merge | | | todo | |

## M4 — Hard widgets + multi-step
Goal: Workday fixture flow completable with manual review only; combobox fill+verify ≥90%.

| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M4-01 | Generic combobox driver: open (element/wrapper/chevron/keyboard) → read options (portals, virtualized) → pick (type-ahead, fuzzy) → verify → retry once → flag; always `Escape` on failure | §8.3 | F8, D-006 | todo | |
| M4-02 | Two-phase options protocol for lazy comboboxes (extract → driver reads options → server picks → driver selects) | §6.3, §8.3 | R2 | todo | |
| M4-03 | Date handling: type in hinted format; flag calendar-only widgets | §8.4 | | todo | |
| M4-04 | Drag-and-drop upload zones | §8.5 | | todo | |
| M4-05 | Step watcher: MutationObserver + history patch, 500 ms debounce, "New step detected"; `autoAdvanceSteps` clicks Next/Continue, never Submit | §9 | F9, R1 | todo | |
| M4-06 | Login / CAPTCHA / account-creation detection → pause and hand control to user (no evasion) | §1, §18 | R7 | todo | |
| M4-07 | Triage failing fixtures; add minimal `AtsAdapter` only per documented failure (record in DECISIONS.md) | §10 | D-003 | todo | |
| M4-08 | Close M4: Workday flow run, combobox success rate, `audit/M4.md`; merge | | | todo | |

## M5 — Learning + writing
Goal: second run on same site ≥50% fewer tokens; corrected answers auto-apply.

| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M5-01 | `/corrections` + `corrections` audit table | §12 | F12 | todo | |
| M5-02 | Mapping cache: `(domain, signature)` then `("*", signature)`; re-resolve profile/answer-bank hits; never cache generated text; signature per D-014 | §7.1, §12 | | todo | |
| M5-03 | Answer-bank suggestions + alias add with user confirmation | §11, §12 | | todo | |
| M5-04 | Writing pass: writing model, JD + top-3 experiences + templates, `maxFreeTextWords` | §7.5 | R2 | todo | |
| M5-05 | `/write` regenerate + panel button | §13 | | todo | |
| M5-06 | Token-reduction test: second run ≥50% fewer tokens | §16 | | todo | |
| M5-07 | Close M5; `audit/M5.md`; merge | | | todo | |

## M6 — Dashboard
| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M6-01 | Server-served web UI: settings + answer bank | §16 | F14 | todo | |
| M6-02 | Application log with token/cost stats (`/applications`) | §13 | F14 | todo | |
| M6-03 | Close M6; `audit/M6.md`; merge | | | todo | |

## M7 — Batch (optional)
| ID | Task | Spec | Req | Status | Evidence |
|---|---|---|---|---|---|
| M7-01 | Playwright batch runner; stops before submit; test proves it | §16 | R1 | todo | |
| M7-02 | Close M7; `audit/M7.md` | | | todo | |

---

## Cross-cutting (every milestone)
- Update `README.md` quick start when commands change.
- Re-run the hard-rule audit table (R1–R7) in the milestone audit file at close.
- Run `pnpm eval` after any change to `apps/server/src/llm/prompts.ts`; record the score in the audit file.
- Any spec deviation → `DECISIONS.md` + `SPEC.md` + commit message note.
