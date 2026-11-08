import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { AUTH_HEADER } from "@job-autofill/shared";
import type { Config } from "./config";
import { tokensMatch } from "./token";

export interface AppDeps {
  config: Config;
  token: string;
  logger?: boolean;
}

export function isAllowedOrigin(
  origin: string | undefined,
  extensionId: string | undefined,
): boolean {
  if (!origin) return true; // non-browser callers send no Origin; the token still applies
  if (extensionId) return origin === `chrome-extension://${extensionId}`;
  return origin.startsWith("chrome-extension://");
}

export async function buildApp({
  config,
  token,
  logger = true,
}: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger });
  const allowedHosts = new Set([`127.0.0.1:${config.port}`, `localhost:${config.port}`]);

  await app.register(cors, {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin, config.extensionId)),
    allowedHeaders: [AUTH_HEADER, "Content-Type"],
  });

  app.addHook("onRequest", async (req, reply) => {
    // Reject DNS-rebinding attempts: only loopback Host headers are served.
    if (!allowedHosts.has(req.headers.host ?? "")) {
      return reply.code(403).send({ error: "forbidden_host" });
    }
    if (req.method === "OPTIONS") return;
    const provided = req.headers[AUTH_HEADER.toLowerCase()];
    if (!tokensMatch(token, typeof provided === "string" ? provided : undefined)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
