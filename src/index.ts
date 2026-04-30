import app from "./server";
import { env } from "./config/env";

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch
});

console.log(
  `[ai-automation-builder] running on http://localhost:${server.port} (${env.NODE_ENV})`
);

