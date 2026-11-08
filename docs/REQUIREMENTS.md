# Requirements

Gathered 2026-11-08 from `CLAUDE.md`, `docs/SPEC.md` and two rounds of owner Q&A. Decisions are logged in `DECISIONS.md` (D-xxx). This file is the consolidated view; `SPEC.md` has the detail.

## 1. Product
Chrome MV3 extension + local Fastify server. Reads job application forms on **any** site, fills them using LLM reasoning over the owner's resume and answer bank. The owner reviews and submits manually.

- **Audience:** owner now; open-source later (D-002). Single profile, local-only. Keep repo free of PII so it can be published.
- **Generic-first (D-003):** must work on any careers page without site-specific code. ATS adapters are minimal fallbacks added only when a fixture fails.

## 2. Hard rules (from CLAUDE.md, audited every milestone)
| # | Rule |
|---|---|
| R1 | Never auto-submit. No clicks on `/submit\|apply\|send application/i`. Guard in `apps/extension/src/fill/` with a test. |
| R2 | Never fabricate user data. Unknown → `null` + `note`. Option fields use an exact provided option. |
| R3 | API key only in `apps/server/.env`. No Anthropic SDK in the extension. |
| R4 | No raw HTML to the LLM. Only compact `FieldRecord`s. |
| R5 | No real personal data in the repo. Never commit `.env`, `*.db`, `data/`. |
| R6 | Model IDs come from config/env only. |
| R7 | No CAPTCHA solving or bot-detection evasion; pause and hand control to the user. |

## 3. Functional requirements
| ID | Requirement | Spec | Decision |
|---|---|---|---|
| F1 | Parse resume PDF into editable Profile; stored in SQLite | §5.1, §13 | |
| F2 | Answer bank CRUD with seeded canonical keys | §5.2 | |
| F3 | Extract fields across frames + open shadow DOM; closed shadow / uninjectable frames flagged for manual | §6, §18 | D-008 |
| F4 | `FieldRecord` carries all signals: label, name, id, placeholder, autocomplete, aria, section, helper, options | §5.3, §6.2.1 | D-005 |
| F5 | Rule pass (label + autocomplete + name) before LLM; cache pass; LLM mapping; writing pass | §7 | |
| F6 | Post-validation: option membership (fuzzy ≥0.85), maxLength, required-null notes | §7.4 | |
| F7 | Generic filler: text (React-safe), select, radio, checkbox, file, rich text | §8 | |
| F8 | Robust generic combobox driver: open → read options → pick → verify | §8.3 | D-006 |
| F9 | Multi-step detection; on-demand injection; autoAdvance never clicks Submit | §9, §14 | D-008 |
| F10 | Side panel: scan/fill, review table with edits, confidence + source, profile/answers/settings | §11 | |
| F11 | Sensitive fields always amber and need explicit confirmation | §8.7 | D-010 |
| F12 | Learning loop: corrections, aliases, mapping cache | §12 | |
| F13 | Hard token caps per application and per day, server-enforced | §5.5, §7.6 | D-011 |
| F14 | Dashboard (settings, answers, application log, token/cost) | M6 | |

## 4. Non-functional requirements
- TypeScript strict; zod in `packages/shared` is the single source of truth for types.
- Server binds `127.0.0.1`, `X-Autofill-Token` auth, CORS limited to the extension origin.
- Minimal extension permissions: `activeTab`, `scripting`, `sidePanel`, `storage`, `http://127.0.0.1/*`.
- Log counts and field signatures, never personal values.
- Every new field type, widget driver or adapter ships with a fixture-based test.
- Every LLM response zod-validated; retry once with the error appended.
- `pnpm lint && pnpm typecheck && pnpm test` green before any task is `done`.

## 5. Acceptance (summary; full table in `audit/M*.md`)
Measured on the **mixed fixture set** (D-004): extractor ≥95% label accuracy (M2), ≥90% correct fill with generic engine only (M3), Workday flow completable with manual review (M4), ≥50% token reduction on second run (M5).

## 6. Dependencies on the owner
| Need | Needed by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` in `apps/server/.env` | M1 (resume parse) | Never committed |
| Real resume PDF | M1 | Stays local under `data/`; fake profile used in repo |
| 10–15 saved real forms (Save Page As → complete) | M2 | Custom careers pages, embedded Greenhouse/Lever iframes, Workday flow, Naukri, LinkedIn Easy Apply, 2+ plain HTML. Logged-in pages carry PII: scrub before commit. LinkedIn/Naukri fixtures go in gitignored `tests/fixtures/private/` (D-016) |
| Real answers for seeded keys | M3 e2e / manual use | Local only |
| Merge branches to `main` | each milestone close | Agent never pushes (D-012) |

## 7. Resolved questions
| ID | Question | Answer | Decision |
|---|---|---|---|
| Q1 | How to apply vision output | Vision fallback out of scope; unparseable forms flagged for manual entry. No unnecessary token use | D-013 |
| Q2 | Cache signature with weak labels | Include `autocomplete` + `name` | D-014 |
| Q3 | Cap units | Tokens (defaults tuned after measured runs) | D-015 |
| Q4 | LinkedIn/Naukri ToS | Accepted for personal use; those fixtures stay out of the open-source repo | D-016 |
| Q5 | Tool versions | Latest Node, pnpm, Chromium | D-017 |
| Q6 | Server token flow | Paste printed token into panel (default, unchallenged) | |

## 8. Out of scope
Vision/screenshot fallback; CAPTCHA solving; auto-submit; cloud storage of personal data; multi-profile (until open-sourcing is revisited).
