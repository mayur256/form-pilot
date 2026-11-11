import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, isAllowedOrigin } from "./app";
import { HOST, loadConfig } from "./config";
import { loadOrCreateToken, tokensMatch } from "./token";

const TOKEN = "test-token";
const host = "127.0.0.1:4317";
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp({ config: loadConfig({}), token: TOKEN, logger: false });
});
afterAll(() => app.close());

describe("auth + health", () => {
  it("returns 200 with a valid token", async () => {
    const res = await app.inject({ url: "/health", headers: { host, "x-autofill-token": TOKEN } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("returns 401 without or with a wrong token", async () => {
    const none = await app.inject({ url: "/health", headers: { host } });
    const wrong = await app.inject({
      url: "/health",
      headers: { host, "x-autofill-token": "nope" },
    });
    expect(none.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
  });

  it("protects unknown routes too (no unauthenticated probing)", async () => {
    const res = await app.inject({ url: "/anything", headers: { host } });
    expect(res.statusCode).toBe(401);
  });

  it("rejects non-loopback Host headers (DNS rebinding)", async () => {
    const res = await app.inject({
      url: "/health",
      headers: { host: "evil.example:4317", "x-autofill-token": TOKEN },
    });
    expect(res.statusCode).toBe(403);
  });

  it("answers CORS preflight for an extension origin only", async () => {
    const ok = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        host,
        origin: "chrome-extension://abc",
        "access-control-request-method": "GET",
        "access-control-request-headers": "x-autofill-token",
      },
    });
    expect(ok.statusCode).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe("chrome-extension://abc");
    const bad = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { host, origin: "https://evil.example", "access-control-request-method": "GET" },
    });
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("config + token", () => {
  it("only binds loopback, whatever the env says", () => {
    expect(HOST).toBe("127.0.0.1");
    expect(loadConfig({ PORT: "5000", HOST: "0.0.0.0" }).host).toBe("127.0.0.1");
  });

  it("reads model ids from env and treats blanks as unset", () => {
    const c = loadConfig({ MAPPING_MODEL: "m-x", WRITING_MODEL: "", ANTHROPIC_API_KEY: "" });
    expect(c.models.mapping).toBe("m-x");
    expect(c.models.writing.length).toBeGreaterThan(0);
    expect(c.anthropicApiKey).toBeUndefined();
  });

  it("generates a 0600 token once and then reuses it", () => {
    const dir = mkdtempSync(join(tmpdir(), "autofill-"));
    const first = loadOrCreateToken(dir);
    const second = loadOrCreateToken(dir);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.token).toBe(first.token);
    expect(readFileSync(join(dir, "token"), "utf8").trim()).toBe(first.token);
    expect(statSync(join(dir, "token")).mode & 0o777).toBe(0o600);
  });

  it("compares tokens safely", () => {
    expect(tokensMatch("a", "a")).toBe(true);
    expect(tokensMatch("a", "b")).toBe(false);
    expect(tokensMatch("a", undefined)).toBe(false);
  });

  it("filters CORS origins", () => {
    expect(isAllowedOrigin("chrome-extension://x", undefined)).toBe(true);
    expect(isAllowedOrigin("chrome-extension://x", "y")).toBe(false);
    expect(isAllowedOrigin("https://a.com", undefined)).toBe(false);
    expect(isAllowedOrigin(undefined, "y")).toBe(true);
  });
});
