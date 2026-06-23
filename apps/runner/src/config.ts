export type RunnerServerConfig = {
  host: string;
  port: number;
};

const defaultHost = "127.0.0.1";
const defaultPort = 4001;
const portRangeMessage = "expected an integer between 1 and 65535";

export function parseRunnerPort(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return defaultPort;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid PORT "${value}": ${portRangeMessage}.`);
  }

  const port = Number(trimmed);

  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT "${value}": ${portRangeMessage}.`);
  }

  return port;
}

export function resolveRunnerServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): RunnerServerConfig {
  return {
    host: env.HOST?.trim() || defaultHost,
    port: parseRunnerPort(env.PORT),
  };
}
