#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const runnerRoot = fileURLToPath(new URL("..", import.meta.url));
export const repoEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));

export function buildRunnerDevArgs({
  envExists = existsSync(repoEnvPath),
  envPath = repoEnvPath,
} = {}) {
  return [
    ...(envExists ? [`--env-file=${envPath}`] : []),
    "--import",
    "tsx",
    "--watch",
    "src/index.ts",
  ];
}

function run() {
  const child = spawn(process.execPath, buildRunnerDevArgs(), {
    cwd: runnerRoot,
    env: process.env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exitCode = code ?? 0;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
