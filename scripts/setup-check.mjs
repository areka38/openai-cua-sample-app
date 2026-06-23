#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const runnerRequire = createRequire(new URL("../apps/runner/package.json", import.meta.url));
const minimumNodeVersion = "22.20.0";
const defaultOptions = {
  allowPlaceholderKey: false,
  envFile: ".env",
  skipPlaywright: false,
};

function usage() {
  return [
    "Usage: pnpm setup:check [--env-file <path>] [--skip-playwright] [--allow-placeholder-key]",
    "",
    "Checks Node, pnpm, required env keys, env value ranges, and the Playwright Chromium install.",
  ].join("\n");
}

export function parseArgs(argv) {
  const options = { ...defaultOptions };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      return { help: true, options };
    }

    if (arg === "--env-file") {
      const value = argv[index + 1];

      if (!value) {
        throw new Error("--env-file requires a path.");
      }

      options.envFile = value;
      index += 1;
      continue;
    }

    if (arg === "--skip-playwright") {
      options.skipPlaywright = true;
      continue;
    }

    if (arg === "--allow-placeholder-key") {
      options.allowPlaceholderKey = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { help: false, options };
}

export function compareVersions(left, right) {
  const leftParts = left.split(".").map((value) => Number(value));
  const rightParts = right.split(".").map((value) => Number(value));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}

export function parseEnvFile(contents) {
  const env = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue = ""] = match;
    let value = rawValue.trim();
    const quote = value[0];

    if (
      (quote === "\"" || quote === "'") &&
      value.endsWith(quote) &&
      value.length >= 2
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function readEnvFile(path) {
  return parseEnvFile(await readFile(path, "utf8"));
}

export function isPlaceholderApiKey(value) {
  const trimmed = value.trim();

  return (
    trimmed === "sk-proj-123" ||
    trimmed === "your_key_here" ||
    trimmed.includes("your_key_here")
  );
}

function isIntegerString(value) {
  return /^\d+$/.test(value.trim());
}

export function checkPort(value) {
  if (!value || !isIntegerString(value)) {
    return false;
  }

  const port = Number(value);

  return Number.isSafeInteger(port) && port >= 1 && port <= 65_535;
}

export function checkResponseTurnBudget(value) {
  if (!value || !isIntegerString(value)) {
    return false;
  }

  const budget = Number(value);

  return Number.isSafeInteger(budget) && budget >= 1 && budget <= 50;
}

function addResult(results, level, message) {
  results.push({ level, message });
}

async function checkPlaywright(results) {
  try {
    const { chromium } = runnerRequire("playwright");
    const executablePath = chromium.executablePath();

    await access(executablePath, constants.X_OK);
    addResult(results, "ok", `Playwright Chromium is installed at ${executablePath}.`);
  } catch {
    addResult(
      results,
      "error",
      "Playwright Chromium is not installed. Run `pnpm playwright:install` or `pnpm playwright:install:with-deps` on Linux.",
    );
  }
}

function checkRuntime(results, packageJson) {
  const nodeVersion = process.versions.node;

  if (compareVersions(nodeVersion, minimumNodeVersion) < 0) {
    addResult(
      results,
      "error",
      `Node.js ${minimumNodeVersion} or newer is required. Current version is ${nodeVersion}.`,
    );
  } else {
    addResult(results, "ok", `Node.js ${nodeVersion} satisfies the requirement.`);
  }

  const expectedPnpm = packageJson.packageManager?.match(/^pnpm@(.+)$/)?.[1];
  const userAgent = process.env.npm_config_user_agent ?? "";
  const actualPnpm = userAgent.match(/pnpm\/([^\s]+)/)?.[1];

  if (!expectedPnpm) {
    addResult(results, "warn", "Could not read the expected pnpm version.");
    return;
  }

  if (!actualPnpm) {
    addResult(
      results,
      "warn",
      `Could not detect pnpm ${expectedPnpm}. Run this check through \`pnpm setup:check\`.`,
    );
    return;
  }

  if (actualPnpm !== expectedPnpm) {
    addResult(
      results,
      "warn",
      `Expected pnpm ${expectedPnpm}; current command is using pnpm ${actualPnpm}.`,
    );
    return;
  }

  addResult(results, "ok", `pnpm ${actualPnpm} matches packageManager.`);
}

function checkEnvValues(results, env, exampleEnv, options) {
  const missingKeys = Object.keys(exampleEnv).filter((key) => !env[key]?.trim());

  if (missingKeys.length > 0) {
    addResult(
      results,
      "error",
      `Missing required env values from ${options.envFile}: ${missingKeys.join(", ")}.`,
    );
  } else {
    addResult(results, "ok", `${options.envFile} includes all .env.example keys.`);
  }

  const responsesMode = env.CUA_RESPONSES_MODE?.trim().toLowerCase();

  if (!["auto", "fallback", "live"].includes(responsesMode)) {
    addResult(
      results,
      "error",
      "CUA_RESPONSES_MODE must be one of: auto, fallback, live.",
    );
  }

  if (!checkPort(env.PORT ?? "")) {
    addResult(results, "error", "PORT must be an integer between 1 and 65535.");
  }

  if (!checkResponseTurnBudget(env.NEXT_PUBLIC_CUA_DEFAULT_MAX_RESPONSE_TURNS ?? "")) {
    addResult(
      results,
      "error",
      "NEXT_PUBLIC_CUA_DEFAULT_MAX_RESPONSE_TURNS must be an integer between 1 and 50.",
    );
  }

  try {
    new URL(env.RUNNER_BASE_URL ?? "");
  } catch {
    addResult(results, "error", "RUNNER_BASE_URL must be a valid URL.");
  }

  const apiKey = env.OPENAI_API_KEY?.trim() ?? "";

  if (!apiKey) {
    addResult(results, "error", "OPENAI_API_KEY is required for live CUA runs.");
  } else if (!options.allowPlaceholderKey && isPlaceholderApiKey(apiKey)) {
    addResult(
      results,
      "error",
      "OPENAI_API_KEY still looks like a placeholder. Replace it before starting live runs.",
    );
  }
}

function printResults(results) {
  const prefix = {
    error: "ERROR",
    ok: "OK",
    warn: "WARN",
  };

  for (const result of results) {
    console.log(`${prefix[result.level]} ${result.message}`);
  }
}

async function main() {
  let parsed;

  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  if (parsed.help) {
    console.log(usage());
    return;
  }

  const { options } = parsed;
  const results = [];
  const packageJson = JSON.parse(
    await readFile(resolve(repoRoot, "package.json"), "utf8"),
  );

  checkRuntime(results, packageJson);

  let exampleEnv;

  try {
    exampleEnv = await readEnvFile(resolve(repoRoot, ".env.example"));
    addResult(results, "ok", ".env.example is present.");
  } catch {
    addResult(results, "error", ".env.example is missing or unreadable.");
  }

  if (exampleEnv) {
    try {
      const env = await readEnvFile(resolve(repoRoot, options.envFile));

      addResult(results, "ok", `Loaded env file ${options.envFile}.`);
      checkEnvValues(results, env, exampleEnv, options);
    } catch {
      addResult(
        results,
        "error",
        `${options.envFile} is missing. Run \`cp .env.example .env\` and set OPENAI_API_KEY.`,
      );
    }
  }

  if (options.skipPlaywright) {
    addResult(results, "warn", "Skipped Playwright Chromium install check.");
  } else {
    await checkPlaywright(results);
  }

  printResults(results);

  if (results.some((result) => result.level === "error")) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
