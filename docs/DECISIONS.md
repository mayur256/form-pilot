# Decision log

| ID | Date | Decision | Why | Affects |
|---|---|---|---|---|
| D-001 | 2026-11-08 | Moved `SPEC.md` from repo root to `docs/SPEC.md` | `CLAUDE.md` and SPEC §4 both reference `docs/SPEC.md` | docs |
| D-002 | 2026-11-08 | Audience: owner only now, open-source later | Keep single-profile + local-only; keep repo clean (no PII, good docs) so self-hosting is possible later | M0, README |
| D-003 | 2026-11-08 | Generic engine first; ATS adapters are fallbacks, built only when a fixture fails | Must work on any careers page without site-specific code | SPEC §1, §10, §16 |
| D-004 | 2026-11-08 | Fixtures: mixed set of 10–15 diverse real forms; owner saves pages, scrubbing before commit; acceptance measured on the mixed set | Better evidence of real-world generality than one-per-ATS | SPEC §4, §15, §16, CLAUDE.md |
| D-005 | 2026-11-08 | `FieldRecord` carries all signals: label, name, id, placeholder, autocomplete, aria, section, helper text, options | LLM can reason when labels are vague or missing | SPEC §5.3, §6.2.1, §7.3 |
| D-006 | 2026-11-08 | Robust generic combobox driver (open → read options → pick → verify) is a core M4 deliverable | Custom widgets are the main failure point on unknown sites | SPEC §8.3, §16 M4 |
| D-007 | 2026-11-08 | (superseded by D-013) Vision fallback moved to M5 (right after M4); Learning+writing → M6, Dashboard → M7, Batch → M8 | Safety net for forms DOM can't parse | SPEC §16 |
| D-008 | 2026-11-08 | On-demand injection (`activeTab` + `scripting`); step watcher lives only in activated tabs | Resolves SPEC §6.1/§9 vs §14 conflict; minimal permissions | SPEC §9, §14 |
| D-009 | 2026-11-08 | (superseded by D-013)  Vision fallback is manual-trigger only, with preview + confirm; cropped to form region; screenshots not stored | Screenshots can capture PII and non-form content | SPEC §14, §16 M5 |
| D-010 | 2026-11-08 | Sensitive fields (work auth, sponsorship, salary/CTC, notice period, EEO) pre-filled but always amber, need explicit confirm | Legal/negotiating weight; answer bank may be stale | SPEC §8.7 |
| D-011 | 2026-11-08 | Hard token caps per application and per day, enforced server-side across mapping/writing/vision | Guard against runaway loops and surprise spend | SPEC §5.5, §7.6 |
| D-012 | 2026-11-08 | Git: branch per milestone, commit per task; merge to main only after audit file passes; agent never pushes | Keeps milestone gating (CLAUDE.md) auditable | docs/audit |
| D-013 | 2026-11-08 | Vision fallback dropped from scope; milestones renumbered back to Learning=M5, Dashboard=M6, Batch=M7. Unparseable forms are flagged for manual entry | Avoid unnecessary token spend and screenshot privacy exposure | SPEC §16, §18 |
| D-014 | 2026-11-08 | Cache `signature` includes `autocomplete` + `name` | Prevent collisions on vague/missing labels | SPEC §5.3 |
| D-015 | 2026-11-08 | Token caps expressed in tokens, not USD; defaults tuned after measured runs | Simple, model-price independent | SPEC §5.5 |
| D-016 | 2026-11-08 | LinkedIn/Naukri automation accepted for personal use; their fixtures live in gitignored `tests/fixtures/private/`, excluded from open-source release | ToS risk and PII | .gitignore, M2-12 |
| D-017 | 2026-11-08 | Use latest Node, pnpm, Chromium/Playwright | Owner preference | M0-01 |
| D-018 | 2026-11-08 | TypeScript pinned to ~6.0.3 (not latest 7.x) | `typescript-eslint` 8.72 throws "does not support TS 7.0"; exception to D-017 "latest" | M0-01, lint |
| D-019 | 2026-11-08 | WXT `webExt.disabled: true`; dev build loaded manually into real Chrome | Auto-launch opens a fresh profile with no logged-in sessions, contrary to the project premise | M0-04, README |
| D-020 | 2026-11-08 | Server rejects non-loopback `Host` headers (403) and requires token on every route incl. `/health` | DNS-rebinding defense; SPEC §13 "all routes" | M0-03, SPEC §13 |
