import { describe, expect, it } from "vitest";
import {
  FieldRecordSchema,
  FillDecisionSchema,
  SEED_ANSWER_KEYS,
  SENSITIVE_ANSWER_KEYS,
  SettingsSchema,
  defaultSettings,
  isSensitiveAnswerKey,
} from "./index";

describe("shared schemas", () => {
  it("accepts a field record with all §6.2.1 signals", () => {
    const parsed = FieldRecordSchema.parse({
      id: "f1",
      frameId: 0,
      label: "Phone",
      name: "phone",
      htmlId: "phone",
      autocomplete: "tel",
      aria: { role: "textbox" },
      helper: "Include country code",
      hint: "+1 555 0100",
      section: "Contact",
      type: "tel",
      required: true,
      signature: "abc",
    });
    expect(parsed.autocomplete).toBe("tel");
  });

  it("rejects out-of-range confidence", () => {
    const bad = { fieldId: "f1", value: "x", confidence: 1.2, source: "profile" };
    expect(FillDecisionSchema.safeParse(bad).success).toBe(false);
  });

  it("allows null for unknown values", () => {
    const ok = { fieldId: "f1", value: null, confidence: 0, source: "unknown", note: "need data" };
    expect(FillDecisionSchema.safeParse(ok).success).toBe(true);
  });

  it("builds valid default settings from injected model ids", () => {
    const s = defaultSettings({ mapping: "m", writing: "w" });
    expect(SettingsSchema.safeParse(s).success).toBe(true);
    expect(s.fillEEO).toBe("decline");
    expect(s.autoAdvanceSteps).toBe(false);
  });

  it("flags sensitive answer keys and all of them are seeded", () => {
    expect(isSensitiveAnswerKey("expected_ctc")).toBe(true);
    expect(isSensitiveAnswerKey("about_me")).toBe(false);
    for (const k of SENSITIVE_ANSWER_KEYS) expect(SEED_ANSWER_KEYS).toContain(k);
  });
});
