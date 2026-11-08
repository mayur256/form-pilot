# docs/

Tracking and audit area for the Job Autofill build.

| File | Purpose |
|---|---|
| `SPEC.md` | Full technical spec (source of truth for behavior) |
| `REQUIREMENTS.md` | Requirements gathered from the owner, with decisions and open questions |
| `TASKS.md` | Milestone-ordered task list (SPEC §16). Status lives here |
| `DECISIONS.md` | Decision log (ADR-lite): what was decided, why, when |
| `audit/` | One file per milestone: acceptance-criteria evidence, deviations from spec |

## Conventions
- Task IDs: `M<milestone>-<nn>` (e.g. `M2-04`). Never reuse an ID.
- Status: `todo` · `doing` · `blocked` · `done` · `dropped`.
- A task is `done` only when its tests pass and `pnpm lint && pnpm typecheck && pnpm test` is green.
- A milestone is closed only when its audit file shows every acceptance criterion with evidence (command output, test name, or commit).
- Any deliberate deviation from `SPEC.md` is logged in `DECISIONS.md` and the spec is updated.
- Hard rules from `CLAUDE.md` are audited at every milestone close (see `audit/TEMPLATE.md`).
