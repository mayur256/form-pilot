import { z } from "zod";

/** Single source of truth for cross-package types. Change types here first. */

const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "expected YYYY-MM");

// ── Profile (SPEC §5.1) ────────────────────────────────────────────────────────
export const ProfileSchema = z.object({
  personal: z.object({
    fullName: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string().optional(),
    linkedinUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
    githubUrl: z.string().optional(),
  }),
  summary: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string().optional(),
      startDate: isoMonth,
      endDate: z.union([isoMonth, z.literal("present")]),
      highlights: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string().optional(),
      startDate: isoMonth.optional(),
      endDate: isoMonth.optional(),
      grade: z.string().optional(),
    }),
  ),
  skills: z.array(z.object({ name: z.string(), years: z.number().nonnegative().optional() })),
  certifications: z.array(
    z.object({ name: z.string(), issuer: z.string().optional(), date: isoMonth.optional() }),
  ),
  languages: z.array(z.object({ name: z.string(), proficiency: z.string().optional() })),
  resumeFile: z.object({ path: z.string(), mime: z.string(), sha256: z.string() }),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ── Answer bank (SPEC §5.2) ────────────────────────────────────────────────────
export const AnswerKindSchema = z.enum(["fact", "preference", "template"]);
export const AnswerSchema = z.object({
  id: z.string(),
  key: z.string().min(1),
  question: z.string(),
  aliases: z.array(z.string()),
  value: z.string(),
  kind: AnswerKindSchema,
  updatedAt: z.string(),
});
export type Answer = z.infer<typeof AnswerSchema>;

/** Seed keys created on first run, with empty values (SPEC §5.2). */
export const SEED_ANSWER_KEYS = [
  "notice_period",
  "current_ctc",
  "expected_ctc",
  "total_experience_years",
  "willing_to_relocate",
  "work_authorization",
  "requires_sponsorship",
  "preferred_locations",
  "remote_preference",
  "gender",
  "disability",
  "veteran_status",
  "how_did_you_hear",
  "why_this_role",
  "about_me",
] as const;

/**
 * Answer keys with legal or negotiating weight. Always shown amber for explicit
 * confirmation regardless of confidence (SPEC §8.7, D-010).
 */
export const SENSITIVE_ANSWER_KEYS = [
  "work_authorization",
  "requires_sponsorship",
  "current_ctc",
  "expected_ctc",
  "notice_period",
  "gender",
  "disability",
  "veteran_status",
] as const;
export function isSensitiveAnswerKey(key: string): boolean {
  return (SENSITIVE_ANSWER_KEYS as readonly string[]).includes(key);
}

// ── FieldRecord (SPEC §5.3, §6.2.1): compact, never raw HTML ───────────────────
export const FieldTypeSchema = z.enum([
  "text",
  "email",
  "tel",
  "url",
  "number",
  "date",
  "textarea",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "checkbox_group",
  "combobox",
  "file",
  "richtext",
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldRecordSchema = z.object({
  id: z.string(),
  frameId: z.number().int(),
  label: z.string(),
  hint: z.string().optional(),
  helper: z.string().optional(),
  name: z.string().optional(),
  htmlId: z.string().optional(),
  autocomplete: z.string().optional(),
  aria: z.record(z.string(), z.string()).optional(),
  section: z.string().optional(),
  type: FieldTypeSchema,
  options: z.array(z.string()).optional(),
  required: z.boolean(),
  maxLength: z.number().int().positive().optional(),
  currentValue: z.string().optional(),
  signature: z.string(),
});
export type FieldRecord = z.infer<typeof FieldRecordSchema>;

// ── FillPlan (SPEC §5.4) ───────────────────────────────────────────────────────
export const FillSourceSchema = z.enum(["profile", "answer_bank", "generated", "cache", "unknown"]);
export const FillDecisionSchema = z.object({
  fieldId: z.string(),
  value: z.union([z.string(), z.array(z.string()), z.boolean(), z.null()]),
  confidence: z.number().min(0).max(1),
  source: FillSourceSchema,
  sourceRef: z.string().optional(),
  note: z.string().optional(),
});
export type FillDecision = z.infer<typeof FillDecisionSchema>;

export const FillPlanSchema = z.object({
  decisions: z.array(FillDecisionSchema),
  model: z.string(),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
});
export type FillPlan = z.infer<typeof FillPlanSchema>;

// ── Settings (SPEC §5.5) ───────────────────────────────────────────────────────
export const SettingsSchema = z.object({
  mappingModel: z.string().min(1),
  writingModel: z.string().min(1),
  temperature: z.number().min(0).max(1),
  confidenceThreshold: z.number().min(0).max(1),
  autoFillHighConfidence: z.boolean(),
  autoAdvanceSteps: z.boolean(),
  dryRun: z.boolean(),
  useCache: z.boolean(),
  maxFreeTextWords: z.number().int().positive(),
  fillEEO: z.enum(["skip", "decline", "answer_bank"]),
  maxTokensPerApplication: z.number().int().positive(),
  maxTokensPerDay: z.number().int().positive(),
});
export type Settings = z.infer<typeof SettingsSchema>;

/**
 * Cap defaults are provisional; tune from measured runs in task M3-05 (D-015).
 * Model IDs are injected from server config, never defaulted here (rule 6).
 */
export function defaultSettings(models: { mapping: string; writing: string }): Settings {
  return {
    mappingModel: models.mapping,
    writingModel: models.writing,
    temperature: 0,
    confidenceThreshold: 0.7,
    autoFillHighConfidence: true,
    autoAdvanceSteps: false,
    dryRun: false,
    useCache: true,
    maxFreeTextWords: 150,
    fillEEO: "decline",
    maxTokensPerApplication: 100_000,
    maxTokensPerDay: 1_000_000,
  };
}

// ── Transport ──────────────────────────────────────────────────────────────────
export const AUTH_HEADER = "X-Autofill-Token";
export const DEFAULT_SERVER_URL = "http://127.0.0.1:4317";
