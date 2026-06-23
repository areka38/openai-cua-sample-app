import { resolveRunnerServerConfig } from "./config.js";
import { createServer } from "./server.js";

const server = createServer();

try {
  const { host, port } = resolveRunnerServerConfig();

  await server.listen({ port, host });
  console.log(`Runner listening on http://${host}:${port}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
