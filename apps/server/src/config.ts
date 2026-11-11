import { z } from "zod";

/** The server only ever binds loopback; this is deliberately not configurable. */
export const HOST = "127.0.0.1" as const;

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

// Model IDs live here (config) and nowhere else in logic (rule 6).
const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.preprocess(blankToUndefined, z.string().optional()),
  MAPPING_MODEL: z.preprocess(blankToUndefined, z.string().default("claude-haiku-5-5")),
  WRITING_MODEL: z.preprocess(blankToUndefined, z.string().default("claude-sonnet-5-5")),
  PORT: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(65535).default(4317)),
  DATA_DIR: z.preprocess(blankToUndefined, z.string().default("./data")),
  EXTENSION_ID: z.preprocess(blankToUndefined, z.string().optional()),
});

export interface Config {
  host: typeof HOST;
  port: number;
  dataDir: string;
  anthropicApiKey: string | undefined;
  models: { mapping: string; writing: string };
  extensionId: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = EnvSchema.parse(env);
  return {
    host: HOST,
    port: e.PORT,
    dataDir: e.DATA_DIR,
    anthropicApiKey: e.ANTHROPIC_API_KEY,
    models: { mapping: e.MAPPING_MODEL, writing: e.WRITING_MODEL },
    extensionId: e.EXTENSION_ID,
  };
}
