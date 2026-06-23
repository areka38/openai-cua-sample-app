import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkPort,
  checkResponseTurnBudget,
  compareVersions,
  parseArgs,
  parseEnvFile,
} from "./setup-check.mjs";

describe("setup-check helpers", () => {
  it("parses CLI options including pnpm's argument separator", () => {
    assert.deepEqual(
      parseArgs([
        "--",
        "--env-file",
        ".env.example",
        "--skip-playwright",
      ]),
      {
        help: false,
        options: {
          envFile: ".env.example",
          skipPlaywright: true,
        },
      },
    );
  });

  it("parses quoted env values and ignores comments", () => {
    assert.deepEqual(
      parseEnvFile([
        "# Runner",
        "PORT='4001'",
        "COMPUTER_USE_DEFAULT_AGENT=codex-cli",
        "",
      ].join("\n")),
      {
        COMPUTER_USE_DEFAULT_AGENT: "codex-cli",
        PORT: "4001",
      },
    );
  });

  it("validates setup numeric ranges", () => {
    assert.equal(checkPort("1"), true);
    assert.equal(checkPort("65535"), true);
    assert.equal(checkPort("0"), false);
    assert.equal(checkPort("65536"), false);
    assert.equal(checkPort("4001.5"), false);

    assert.equal(checkResponseTurnBudget("1"), true);
    assert.equal(checkResponseTurnBudget("50"), true);
    assert.equal(checkResponseTurnBudget("0"), false);
    assert.equal(checkResponseTurnBudget("51"), false);
  });

  it("compares dotted versions", () => {
    assert.equal(compareVersions("22.20.0", "22.20.0"), 0);
    assert.equal(compareVersions("22.22.1", "22.20.0") > 0, true);
    assert.equal(compareVersions("22.19.0", "22.20.0") < 0, true);
  });
});
