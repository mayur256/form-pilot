import { describe, expect, it } from "vitest";
import { checkHealth } from "./server-status";

const base = "http://127.0.0.1:4317";
const fakeFetch = (status: number) => (async () => new Response("{}", { status })) as typeof fetch;

describe("checkHealth", () => {
  it("reports no-token without calling the server", async () => {
    const fetchFn = (async () => {
      throw new Error("must not be called");
    }) as typeof fetch;
    expect(await checkHealth({ baseUrl: base, token: undefined, fetchFn })).toEqual({
      state: "no-token",
    });
  });

  it("maps 200 to ok, 401 to unauthorized, other statuses to unreachable", async () => {
    expect((await checkHealth({ baseUrl: base, token: "t", fetchFn: fakeFetch(200) })).state).toBe(
      "ok",
    );
    expect((await checkHealth({ baseUrl: base, token: "t", fetchFn: fakeFetch(401) })).state).toBe(
      "unauthorized",
    );
    expect((await checkHealth({ baseUrl: base, token: "t", fetchFn: fakeFetch(500) })).state).toBe(
      "unreachable",
    );
  });

  it("maps network errors to unreachable and sends the token header", async () => {
    const boom = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect((await checkHealth({ baseUrl: base, token: "t", fetchFn: boom })).state).toBe(
      "unreachable",
    );
    let seen: Headers | undefined;
    const spy = (async (_u: unknown, init?: RequestInit) => {
      seen = new Headers(init?.headers);
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    await checkHealth({ baseUrl: base, token: "secret", fetchFn: spy });
    expect(seen?.get("x-autofill-token")).toBe("secret");
  });
});
