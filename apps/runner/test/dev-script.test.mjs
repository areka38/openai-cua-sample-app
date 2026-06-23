import { describe, expect, it } from "vitest";

import { buildRunnerDevArgs } from "../scripts/dev.mjs";

describe("runner dev script", () => {
  it("omits the env-file argument when the repo .env file is missing", () => {
    expect(
      buildRunnerDevArgs({
        envExists: false,
        envPath: "/repo/.env",
      }),
    ).toEqual(["--import", "tsx", "--watch", "src/index.ts"]);
  });

  it("passes the env-file argument when the repo .env file exists", () => {
    expect(
      buildRunnerDevArgs({
        envExists: true,
        envPath: "/repo/.env",
      }),
    ).toEqual([
      "--env-file=/repo/.env",
      "--import",
      "tsx",
      "--watch",
      "src/index.ts",
    ]);
  });
});
