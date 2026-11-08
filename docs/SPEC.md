# Job Autofill — Technical Specification

An LLM-powered browser extension that reads job application forms on any website and fills them using the user's resume and a personal answer bank. A human always reviews and submits.

---

## 1. Goals and non-goals

### Goals
- Fill job application forms on **any** site with a **generic engine** that needs no site-specific code. ATS adapters (Greenhouse, Lever, Workday, Ashby, iCIMS, SmartRecruiters, Taleo, SuccessFactors, LinkedIn Easy Apply, Naukri) are fallbacks, built only when a fixture fails under the generic engine (§10).
- Use an LLM at every session to map form fields to the user's data and to draft free-text answers tailored to the job description.
- Never fabricate facts. Unknown answers are left blank and flagged.
- Learn from user corrections so repeat questions and repeat sites need fewer LLM calls.
- Expose tunable execution parameters (model, temperature, confidence threshold, etc.) through a UI, later a web dashboard.

### Non-goals
- **No automatic submission.** The user clicks Submit.
- No CAPTCHA solving or bot-detection evasion. CAPTCHAs, logins and account creation pause the run and hand control back to the user.
- No mass/unattended applying in v1 (a Playwright batch mode is an optional later phase).
- No cloud storage of personal data. Everything is local.

---

## 2. Architecture

```
┌──────────────────────── Chrome (user's real session) ────────────────────────┐
│                                                                              │
│  Content script (all frames)          Side panel (React)                     │
│  ├─ Extractor: DOM → FieldRecord[]    ├─ Start / Re-scan / Fill              │
│  ├─ JD scraper                        ├─ Review table (value, confidence)    │
│  ├─ Filler: FillPlan → DOM            ├─ Inline edit → correction events     │
│  ├─ Step watcher (MutationObserver)   └─ Settings (calibration params)       │
│  └─ ATS adapters                                                             │
│            │  chrome.runtime messages         ▲                              │
│            ▼                                  │                              │
│  Background service worker (router, session state, talks to local server)   │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │ HTTP (localhost only, shared secret)
                                 ▼
                 Local server (Fastify, Node 20+)
                 ├─ /profile   resume → Profile JSON (Claude parses PDF)
                 ├─ /answers   answer bank CRUD
                 ├─ /map       FieldRecord[] + JD → FillPlan (Claude)
                 ├─ /corrections  learning loop
                 ├─ /settings  calibration params
                 └─ SQLite (profile, answers, mapping cache, application log)
                                 │
                                 ▼
                         Anthropic API (key lives only here)
```

**Why this split:** the extension operates inside the user's logged-in browser (works on any site, low bot-detection risk, user can watch). The local server holds the API key and personal data so neither is exposed in extension storage, and it becomes the backend for the future dashboard.

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) everywhere |
| Monorepo | pnpm workspaces |
| Extension framework | WXT (Manifest V3) |
| Side panel UI | React + Tailwind |
| Server | Fastify |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Validation / shared types | zod (schemas in `packages/shared`) |
| LLM | `@anthropic-ai/sdk`, structured output via tool use |
| Unit tests | Vitest |
| Fixture / E2E tests | Playwright (loads the unpacked extension against saved HTML fixtures) |
| Lint / format | ESLint + Prettier |

---

## 4. Repository layout

```
job-autofill/
├─ CLAUDE.md
├─ README.md
├─ docs/
│  └─ SPEC.md                  ← this file
├─ apps/
│  ├─ extension/
│  │  ├─ entrypoints/
│  │  │  ├─ background.ts
│  │  │  ├─ content.ts         ← registers extractor/filler, all_frames
│  │  │  └─ sidepanel/         ← React app
│  │  ├─ src/
│  │  │  ├─ extract/           ← walker, label resolver, field builders
│  │  │  ├─ fill/              ← setters, widget drivers, file upload
│  │  │  ├─ adapters/          ← per-ATS overrides (greenhouse.ts, workday.ts…)
│  │  │  ├─ jd/                ← job description scraper
│  │  │  ├─ steps/             ← multi-step detection
│  │  │  └─ messaging.ts       ← typed message contracts
│  │  └─ wxt.config.ts
│  └─ server/
│     ├─ src/
│     │  ├─ routes/            ← profile, answers, map, corrections, settings
│     │  ├─ llm/               ← client, prompts, tool schemas
│     │  ├─ db/                ← drizzle schema + migrations
│     │  ├─ cache/             ← mapping cache logic
│     │  └─ index.ts
│     └─ .env.example
├─ packages/
│  └─ shared/                  ← zod schemas + inferred types (single source of truth)
└─ tests/
   ├─ fixtures/                ← 10–15 diverse saved real forms, one folder per form (names below illustrative; see §15)
   │  ├─ greenhouse/
   │  ├─ lever/
   │  ├─ workday/
   │  └─ …
   └─ e2e/
```

---

## 5. Data model (`packages/shared`)

All types are defined as zod schemas and exported with `z.infer`.

### 5.1 Profile (parsed from resume)
```ts
Profile = {
  personal: { fullName, firstName, lastName, email, phone, city, state, country,
              postalCode?, linkedinUrl?, portfolioUrl?, githubUrl? },
  summary: string,
  experience: Array<{ company, title, location?, startDate, endDate | "present",
                      highlights: string[] }>,
  education: Array<{ institution, degree, field?, startDate?, endDate?, grade? }>,
  skills: Array<{ name, years?: number }>,
  certifications: Array<{ name, issuer?, date? }>,
  languages: Array<{ name, proficiency? }>,
  resumeFile: { path, mime, sha256 }       // the PDF uploaded to file inputs
}
```
Dates are ISO `YYYY-MM` strings. The profile is editable in the UI after parsing; the parse is a starting point, not truth.

### 5.2 Answer bank
```ts
Answer = {
  id, key,                 // normalized canonical key, e.g. "notice_period"
  question: string,        // representative wording
  aliases: string[],       // other wordings seen ("When can you join?")
  value: string,
  kind: "fact" | "preference" | "template",   // template = reusable paragraph
  updatedAt
}
```
Seed keys on first run (user fills values): `notice_period`, `current_ctc`, `expected_ctc`, `total_experience_years`, `willing_to_relocate`, `work_authorization`, `requires_sponsorship`, `preferred_locations`, `remote_preference`, `gender` (optional), `disability` (optional), `veteran_status` (optional), `how_did_you_hear`, `why_this_role` (template), `about_me` (template).

### 5.3 FieldRecord (extractor output — compact, never raw HTML)
```ts
FieldRecord = {
  id: string,              // ephemeral, e.g. "f12"; mapped to element in content script
  frameId: number,
  label: string,           // best resolved human label
  hint?: string,           // placeholder / helper text / description
  helper?: string,         // nearby helper/description text (aria-describedby or adjacent small text)
  name?: string,           // `name` attribute
  htmlId?: string,         // `id` attribute
  autocomplete?: string,   // autocomplete token, e.g. "given-name", "tel", "organization-title"
  aria?: Record<string, string>, // allow-listed aria-* / role values (never free-form attributes)
  section?: string,        // nearest heading or fieldset legend
  type: "text" | "email" | "tel" | "url" | "number" | "date" | "textarea"
      | "select" | "multiselect" | "radio" | "checkbox" | "checkbox_group"
      | "combobox" | "file" | "richtext",
  options?: string[],      // visible option labels for select/radio/combobox
  required: boolean,
  maxLength?: number,
  currentValue?: string,
  signature: string        // hash(normalizedLabel + type + sortedOptions + autocomplete + name) for caching; the extra signals prevent collisions on vague/missing labels
}
```

### 5.4 FillPlan (LLM output)
```ts
FillDecision = {
  fieldId: string,
  value: string | string[] | boolean | null,  // null = don't know
  confidence: number,                          // 0..1
  source: "profile" | "answer_bank" | "generated" | "cache" | "unknown",
  sourceRef?: string,                          // e.g. "experience[0].title" or answer key
  note?: string                                // why null / what's needed
}
FillPlan = { decisions: FillDecision[], model: string, tokensIn: number, tokensOut: number }
```

### 5.5 Settings (calibration parameters)
```ts
Settings = {
  mappingModel: string,        // default env MAPPING_MODEL
  writingModel: string,        // default env WRITING_MODEL
  temperature: number,         // default 0 for mapping, 0.4 for writing
  confidenceThreshold: number, // default 0.7; below → highlighted for review
  autoFillHighConfidence: boolean, // default true
  autoAdvanceSteps: boolean,   // default false (click "Next" automatically)
  dryRun: boolean,             // compute plan, don't touch the DOM
  useCache: boolean,           // default true
  maxFreeTextWords: number,    // default 150
  fillEEO: "skip" | "decline" | "answer_bank"   // default "decline"
  maxTokensPerApplication: number, // hard cap; server refuses LLM calls past it (default tuned in M3)
  maxTokensPerDay: number          // hard daily cap across applications (default tuned in M3)
}
```

### 5.6 SQLite tables
`profile` (single row JSON), `answers`, `mapping_cache` (`domain`, `signature`, `decision_json`, `hits`, `updatedAt`), `corrections` (audit trail), `applications` (`url`, `domain`, `company?`, `role?`, `startedAt`, `fieldsTotal`, `fieldsFilled`, `fieldsCorrected`, `tokens`), `settings`.

---

## 6. Form extraction (content script)

### 6.1 Discovery
- Content script registered with `all_frames: true` and `match_about_blank: true`. Each frame extracts independently; background aggregates by `frameId`.
- Walk the DOM **including open shadow roots** (recursive `element.shadowRoot`).
- Candidate selectors: `input` (excluding `hidden`, `submit`, `button`, `image`, `reset`), `select`, `textarea`, `[contenteditable="true"]`, `[role="combobox"]`, `[role="listbox"]`, `[role="radiogroup"]`, `[role="checkbox"]`, `[role="textbox"]`.
- Skip invisible elements (zero size, `display:none`, `visibility:hidden`, `aria-hidden="true"` ancestors), except file inputs, which are often visually hidden behind a styled button.
- Group radios by `name` (or by `role="radiogroup"`) into one record; group same-name checkboxes into `checkbox_group`.

### 6.2 Label resolution (first non-empty wins)
1. `aria-labelledby` (join referenced texts)
2. `<label for=id>` or wrapping `<label>`
3. `aria-label`
4. For grouped controls: `<legend>` of the enclosing `fieldset`, or the radiogroup's label
5. `title` attribute
6. Nearest preceding visible text node within the same container (max ~120 chars, walk up ≤3 ancestors)
7. `placeholder` (also stored as `hint`)
8. `name` / `id` attribute, de-camelCased (last resort)

Normalize: trim, collapse whitespace, strip trailing `*` and "(required)". Required = `required` attr, `aria-required="true"`, or a `*` in the raw label.

### 6.2.1 Signal collection (all signals, not just the label)
The label is one signal among many. For every field the extractor also captures, each truncated to ~120 chars and never as raw HTML: `name`, `id`, `placeholder`, `autocomplete` token, allow-listed `aria-*`/`role` values, nearest section heading or legend, nearby helper text (`aria-describedby` targets, adjacent small/muted text), and options. All of these are sent to the LLM in `FieldRecord` so it can reason when the label is vague, generic ("Answer"), or missing. A field with an empty label is still extracted and mapped; the mapper is told to lower confidence accordingly. The deterministic rule pass (§7.1) also uses `autocomplete` and `name` tokens, not just label regexes.

### 6.3 Options
- `<select>`: visible option texts, skipping empty placeholders like "Select…".
- Radios/checkbox groups: each option's resolved label.
- ARIA comboboxes / custom dropdowns: options often render only on open. The extractor records the field with `options: undefined`; the adapter or filler opens it lazily at fill time (see §8.3). Adapters may pre-open to collect options where cheap.

### 6.4 Element registry
Keep a `Map<fieldId, WeakRef<Element>>` in the content script. Field IDs are per-scan; re-scan on step change. Never send selectors or HTML to the server.

### 6.5 Job description scraping
Heuristics, in order: ATS adapter selector → element containing headings like "Job Description", "About the role", "Responsibilities" → largest text block on the page not inside the form. Truncate to ~6,000 characters. Also capture page title, company name (from `og:site_name`, title, or adapter), and role title.

---

## 7. LLM mapping (server)

### 7.1 Flow for `POST /map`
1. Receive `{ url, domain, fields: FieldRecord[], jd, settings }`.
2. **Cache pass:** for each field, look up `mapping_cache` by `(domain, signature)` then by `("*", signature)`. Cache hits whose source is `profile`/`answer_bank` are re-resolved against current data (so updated answers propagate). Generated text is never cached as a final value.
3. **Rule pass (no LLM):** trivial deterministic fields — email, phone, first/last/full name, LinkedIn URL, file input → resume. Use label regexes; mark `source: "profile"`, `confidence: 0.99`.
4. **LLM pass (mapping model):** remaining fields in one call (batch in chunks of ~40 if larger). Send compact profile, full answer bank (keys, questions, values), fields (with all signals from §6.2.1), and a short JD summary.
5. **Writing pass (writing model):** fields the mapping pass marked as needing generated free text (cover-letter style questions, "Why do you want to work here?"). Uses full JD + relevant experience.
6. Merge, validate with zod, enforce option membership (see 7.4), return `FillPlan`.

### 7.2 Structured output
Use a single tool `submit_fill_plan` whose `input_schema` is the JSON Schema of `FillPlan.decisions`, with `tool_choice: { type: "tool", name: "submit_fill_plan" }`. Parse `tool_use.input` and validate with zod. On validation failure, retry once with the error appended.

### 7.3 Mapping system prompt (starting point — tune in `apps/server/src/llm/prompts.ts`)
```
You fill job application forms on behalf of the candidate using ONLY the
provided profile and answer bank.

Rules:
- Never invent facts (employers, dates, numbers, degrees, salaries, legal status).
  If the data does not contain the answer, return value=null, source="unknown",
  and put what is needed in `note`.
- For select, radio, combobox and checkbox_group fields, the value MUST be one
  of the provided options, copied exactly. Choose the closest semantic match
  (e.g. "Bachelor's" for "B.Tech"). If none fits, return null.
- Dates: match the field's expected format from its hint/placeholder; default
  YYYY-MM-DD.
- Numbers: digits only unless the label asks for units. Convert currency or
  units only if the label clearly requires it, and note it.
- Yes/No questions: answer from the answer bank; if absent, return null.
- EEO/demographic questions: follow the `fillEEO` setting.
- For open-ended questions that need a written answer, return
  source="generated", value=null, note="needs_writing". Do not write it here.
- Use every signal on the field (label, name, id, autocomplete, aria, section,
  helper, placeholder, options). When the label is vague or missing, infer from
  the other signals and reduce confidence; if still unclear, return null.
- confidence: 0.9+ exact match, 0.7–0.9 reasonable inference, <0.7 guess.
```

### 7.4 Post-validation (server, deterministic)
- Option fields: if value not in `options`, try case-insensitive and fuzzy match (normalized Levenshtein ≥ 0.85); otherwise set null.
- Truncate to `maxLength`.
- Required field left null → keep null, ensure `note` explains.

### 7.5 Writing prompt
Inputs: question, JD (truncated), profile summary + top 3 relevant experiences, any `template` answers, `maxFreeTextWords`. Rules: first person, specific, grounded only in profile facts, no clichés, no fabricated metrics, respect word limit.

### 7.6 Cost controls
- Never send HTML. Profile is sent in compact form; only include experience highlights in the writing pass.
- Cache + rule pass before any LLM call. Log tokens per application in `applications`.
- Use prompt caching on the static system prompt + profile + answer bank block.
- **Hard caps:** the server enforces `maxTokensPerApplication` and `maxTokensPerDay`, refusing further LLM calls with a typed error that the panel surfaces. Caps apply to mapping and writing calls alike.

---

## 8. Filling engine (content script)

### 8.1 Text-like inputs (React/Angular/Vue safe)
```ts
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  el.focus();
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}
```
After setting, read back the value; if the framework reverted it, fall back to simulated typing (`keydown`/`keypress`/`input`/`keyup` per character with small delays).

### 8.2 Native select, radio, checkbox
- Select: find option by text, set `selectedIndex` via native setter, dispatch `change`.
- Radio/checkbox: `element.click()` (not `.checked = true`) so handlers fire; verify state after.

### 8.3 Custom dropdowns / comboboxes
The generic combobox/dropdown driver is the main defense against unknown sites, so it must be robust on its own. Sequence: **open → read options → pick → verify**.
1. **Open:** click the trigger (try the element, then its wrapper, then an adjacent chevron/button); fall back to focus + `ArrowDown`/`Enter`/`Space`.
2. **Read options:** wait for `[role="listbox"]` / `[role="option"]` / `li` inside a newly added popup (MutationObserver, ≤2s), including portals appended to `body` and shadow roots. Collect option texts, scrolling virtualized lists. Report them back so the mapper can choose an exact option (two-phase: extract with `options: undefined` → driver reads options → server picks → driver selects).
3. **Pick:** type into the search input if present (async-filtered lists), then click the option that best matches (exact → case-insensitive → fuzzy ≥0.85); never pick an option the mapper didn't choose.
4. **Verify:** read the displayed value / `aria-activedescendant` / selected chip; if it doesn't match, retry once, then flag the field for manual entry (amber/red highlight).
Always close the popup (`Escape`) on failure. Adapters override this only for widgets the generic driver demonstrably fails on (React-Select, Workday `data-automation-id` widgets, etc.).

### 8.4 Date pickers
Prefer typing into the underlying input in the hinted format. If it's a calendar-only widget, adapter handles it; generic fallback flags the field for manual entry.

### 8.5 File upload (resume)
Fetch the resume bytes from the server, build a `File`, attach via `DataTransfer`:
```ts
const dt = new DataTransfer();
dt.items.add(new File([bytes], "Resume.pdf", { type: "application/pdf" }));
input.files = dt.files;
input.dispatchEvent(new Event("change", { bubbles: true }));
```
Some sites use drag-and-drop zones; adapter dispatches `dragenter`/`dragover`/`drop` with the same `DataTransfer`.

### 8.6 Rich text / contenteditable
Focus, select all, `document.execCommand("insertText", false, value)` (still the most compatible path), then dispatch `input`.

### 8.7 Fill rules
- Never overwrite a non-empty field unless the user clicked "Overwrite".
- Fill in DOM order with 50–150 ms jitter between fields (some forms validate on blur and re-render).
- **Sensitive fields** (work authorization, sponsorship, salary/CTC, notice period, EEO/demographic) are pre-filled from the answer bank but are *always* amber and require explicit user confirmation in the review table, regardless of confidence. The sensitive-key list is a fixed constant in `packages/shared`.
- Highlight every filled field: green outline (≥ threshold), amber (< threshold), red (null + required). Remove highlights on submit or panel close.
- Never click anything whose text matches `/submit|apply|send application/i`.

---

## 9. Multi-step forms
- `MutationObserver` on the form root + URL change listener (`popstate`, history patch).
- The watcher runs only in tabs where the user activated the extension (on-demand injection via `activeTab` + `scripting`, per §14); it ends when the tab closes or the panel is dismissed. Content script injection into each frame uses `scripting.executeScript({ allFrames: true })` on activation.
- On significant change (new fields appear, old ones gone), debounce 500 ms, re-extract, and show "New step detected — Fill this step?" in the panel.
- If `autoAdvanceSteps` is on and every required field on the step is filled at ≥ threshold, click the step's Next/Continue button (never Submit).

---

## 10. ATS adapters
Interface:
```ts
interface AtsAdapter {
  id: string;
  matches(url: URL, doc: Document): boolean;
  scrapeJob?(doc: Document): { title?: string; company?: string; description?: string };
  enhanceFields?(fields: FieldRecord[], registry: ElementRegistry): FieldRecord[];
  fill?(field: FieldRecord, el: Element, value: unknown): Promise<boolean>; // return false → use generic
  nextButton?(doc: Document): HTMLElement | null;
}
```
**Adapters are fallbacks only.** The generic engine must work on any careers page without site-specific code. Build an adapter only when a fixture in the mixed set (§15) fails under the generic engine, keep it minimal (override just the failing step: `fill`, `enhanceFields`, or `nextButton`), and record the failing fixture + reason in `docs/DECISIONS.md`. Candidate list (unordered; driven by fixture failures, not a roadmap): Greenhouse, Lever, Ashby, Workday, iCIMS, SmartRecruiters, LinkedIn Easy Apply, Naukri, Taleo, SuccessFactors.

---

## 11. Side panel UI
- **Session view:** detected ATS, company, role; buttons *Scan*, *Fill*, *Re-scan*; progress counts (filled / review / missing).
- **Review table:** label, value (editable), confidence badge, source chip, note. Clicking a row scrolls to and flashes the field. Editing a value writes it to the page and emits a correction.
- **Missing answers prompt:** for null required fields with a recognizable canonical question, offer "Save to answer bank" after the user types it.
- **Profile & Answer bank editors.**
- **Settings:** all `Settings` fields from §5.5.
- Open via toolbar click (`chrome.sidePanel`) and keyboard shortcut (`Alt+Shift+F`).

---

## 12. Learning loop
On correction `{domain, field signature, label, oldValue, newValue}`:
1. Store in `corrections`.
2. If the field maps to an existing answer key → update that answer's value (ask the user to confirm in UI) and add the label to `aliases`.
3. If it's a new recurring question → offer to create an answer bank entry.
4. Upsert `mapping_cache` for `(domain, signature)` with source + sourceRef (not the raw generated text).

---

## 13. Server API
All routes require header `X-Autofill-Token` (random secret generated on first server run, pasted into extension settings). Server binds to `127.0.0.1` only. CORS restricted to the extension origin.

| Method | Route | Purpose |
|---|---|---|
| POST | `/profile/parse` | multipart PDF upload → Claude parses (PDF sent as a document block) → Profile; stores resume file |
| GET/PUT | `/profile` | read / edit profile |
| GET | `/profile/resume` | resume bytes for upload fields |
| GET/POST/PUT/DELETE | `/answers` | answer bank CRUD |
| POST | `/map` | FieldRecord[] + JD → FillPlan |
| POST | `/write` | regenerate one free-text answer |
| POST | `/corrections` | learning loop |
| GET/PUT | `/settings` | calibration params |
| GET | `/applications` | log for dashboard |
| GET | `/health` | liveness |

---

## 14. Security and privacy
- `ANTHROPIC_API_KEY` lives only in `apps/server/.env`; never in extension code or storage.
- Personal data stays in local SQLite. `.env`, `*.db`, and `data/` are gitignored. Test fixtures must contain no real personal data — use a fake profile (`tests/fixtures/profile.fake.json`).
- Extension permissions kept minimal: `activeTab`, `scripting`, `sidePanel`, `storage`, host permission for `http://127.0.0.1/*`. Content script injected on demand (via `activeTab` + `scripting`) rather than on `<all_urls>` at load, where possible.
- Don't log full field values at info level; log counts and signatures.

---

## 15. Testing strategy
- **Fixtures:** a **mixed set of 10–15 diverse real forms**, not one per ATS: custom company careers pages, embedded Greenhouse/Lever iframes, a Workday flow, Naukri, LinkedIn Easy Apply, and a couple of plain HTML forms. The owner saves pages (Save Page As → complete) into `tests/fixtures/<name>/`; scrubbing personal data is done before commit. Each fixture has an `expected.json` listing labels, types and options the extractor must find. All acceptance criteria in §16 are measured over this mixed set.
- **Unit (Vitest + jsdom/happy-dom):** label resolver, option extraction, grouping, signature hashing, post-validation fuzzy matching, cache logic.
- **E2E (Playwright, Chromium with unpacked extension):** load fixture → run scan → assert extracted fields match `expected.json` → run fill with a mocked `/map` → assert DOM values and that framework state updated (read back after blur).
- **LLM evals:** a small set of `(fields, profile, answers) → expected decisions` cases run against the real API behind `pnpm eval` (not in CI by default). Track accuracy when changing prompts or models.

---

## 16. Milestones and acceptance criteria

### M0 — Scaffold
pnpm monorepo, WXT extension loads, side panel opens, Fastify `/health`, shared zod package, lint/test scripts, CI running lint + unit tests.
**Done when:** `pnpm dev` runs both apps and the panel shows server status.

### M1 — Profile + answer bank
Resume PDF parse, profile editor, answer bank with seeded keys, settings persistence.
**Done when:** uploading a resume yields an editable profile that round-trips through SQLite.

### M2 — Extraction
Walker, shadow DOM, iframes, label resolver, grouping, JD scraper, Scan button showing fields in the panel.
**Done when:** extractor passes `expected.json` across the mixed fixture set (§15) with ≥95% label accuracy, with every §6.2.1 signal captured.

### M3 — Mapping + fill (MVP)
Rule pass, LLM mapping, post-validation, generic filler for text/select/radio/checkbox/file, highlights, review table with edits.
**Done when:** across the mixed fixture set, ≥90% of fields fill correctly using the generic engine only, no Submit click possible, values survive blur.

### M4 — Hard widgets + multi-step
Robust generic combobox/dropdown driver (§8.3: open → read options → pick → verify), date handling, drag-drop upload, step watcher, on-demand injection. Adapters only for fixtures that still fail under the generic engine (§10).
**Done when:** the generic engine completes the Workday fixture flow step-by-step with only manual review, and combobox fill+verify succeeds on ≥90% of custom dropdowns in the mixed set. Any adapter built has a documented failing fixture.

### M5 — Learning + writing
Corrections, mapping cache, answer bank suggestions, writing pass with JD tailoring, `/write` regenerate button.
**Done when:** second run on the same site uses ≥50% fewer tokens and corrected answers auto-apply.

### M6 — Dashboard
Web UI served by the server: settings, answer bank, application log with token/cost stats.

### M7 (optional) — Batch
Playwright batch runner (still stops before submit).

---

## 17. Environment
`apps/server/.env.example`:
```
ANTHROPIC_API_KEY=
MAPPING_MODEL=claude-haiku-5-5
WRITING_MODEL=claude-sonnet-5-5
PORT=4317
DATA_DIR=./data
```
Model IDs must stay configurable — never hardcode them outside config.

---

## 18. Out of scope: vision fallback
Forms the DOM extractor cannot parse (canvas-rendered, closed shadow roots) are flagged for manual entry. No screenshot/vision path (avoids token spend and screenshot privacy exposure).

## 18.1 Known hard cases (track as issues)
- Workday: heavy custom widgets, per-tenant variation, account creation per company.
- Forms that validate on keystroke and reset values set programmatically.
- Closed shadow roots (cannot be read — flag for manual).
- Cross-origin iframes where the content script isn't injected (ensure `all_frames` + host permission on the iframe origin via `activeTab` grant).
- Questions with ambiguous intent ("Are you comfortable with the location?") — prefer null + note over guessing.
- Salary fields with currency/period ambiguity (CTC per annum vs monthly).
