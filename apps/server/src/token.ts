import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Reads the shared secret from DATA_DIR/token, generating it on first run. */
export function loadOrCreateToken(dataDir: string): { token: string; created: boolean } {
  const file = join(dataDir, "token");
  try {
    const existing = readFileSync(file, "utf8").trim();
    if (existing) return { token: existing, created: false };
  } catch {
    // fall through and create
  }
  mkdirSync(dataDir, { recursive: true });
  const token = randomBytes(32).toString("hex");
  writeFileSync(file, `${token}\n`, { mode: 0o600 });
  return { token, created: true };
}

export function tokensMatch(expected: string, provided: string | undefined): boolean {
  if (!provided) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return timingSafeEqual(a, b);
}
