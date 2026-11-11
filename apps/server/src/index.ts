import "dotenv/config";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { loadOrCreateToken } from "./token";

const config = loadConfig();
const { token, created } = loadOrCreateToken(config.dataDir);
const app = await buildApp({ config, token });

await app.listen({ host: config.host, port: config.port });
console.log(
  `${created ? "Generated" : "Loaded"} server token (paste into the extension panel):\n${token}`,
);
