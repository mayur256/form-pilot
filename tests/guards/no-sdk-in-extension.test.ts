import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Rule 3: the API key and Anthropic SDK live only in apps/server.
const root = join(import.meta.dirname, "../../apps/extension");
const SKIP = new Set(["node_modules", ".output", ".wxt"]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

describe("rule 3: no Anthropic SDK or API key in the extension", () => {
  it("has no SDK import or API key reference in extension sources", () => {
    const offenders = [...walk(root)]
      .filter(
        (f) => /\.(ts|tsx|js|mjs|json|html)$/.test(f) && !f.endsWith("no-sdk-in-extension.test.ts"),
      )
      .filter((f) =>
        /@anthropic-ai\/sdk|ANTHROPIC_API_KEY|api\.anthropic\.com/.test(readFileSync(f, "utf8")),
      );
    expect(offenders).toEqual([]);
  });

  it("does not declare the SDK as a dependency", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Record<
      string,
      Record<string, string>
    >;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps)).not.toContain("@anthropic-ai/sdk");
  });
});
