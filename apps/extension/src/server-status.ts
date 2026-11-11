import { AUTH_HEADER } from "@job-autofill/shared";

export type ServerStatus =
  { state: "ok" } | { state: "no-token" } | { state: "unauthorized" } | { state: "unreachable" };

export async function checkHealth(opts: {
  baseUrl: string;
  token: string | undefined;
  fetchFn?: typeof fetch;
}): Promise<ServerStatus> {
  if (!opts.token) return { state: "no-token" };
  const doFetch = opts.fetchFn ?? fetch;
  try {
    const res = await doFetch(new URL("/health", opts.baseUrl), {
      headers: { [AUTH_HEADER]: opts.token },
    });
    if (res.status === 401) return { state: "unauthorized" };
    return res.ok ? { state: "ok" } : { state: "unreachable" };
  } catch {
    return { state: "unreachable" };
  }
}
