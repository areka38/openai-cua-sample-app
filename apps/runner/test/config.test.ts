import { describe, expect, it } from "vitest";

import {
  parseRunnerPort,
  resolveRunnerServerConfig,
} from "../src/config.js";

describe("parseRunnerPort", () => {
  it("uses the default port when PORT is missing or blank", () => {
    expect(parseRunnerPort(undefined)).toBe(4001);
    expect(parseRunnerPort("  ")).toBe(4001);
  });

  it("uses a valid configured port", () => {
    expect(parseRunnerPort("5000")).toBe(5000);
    expect(parseRunnerPort(" 4002 ")).toBe(4002);
  });

  it("rejects invalid configured ports", () => {
    expect(() => parseRunnerPort("not-a-port")).toThrow(/Invalid PORT/);
    expect(() => parseRunnerPort("0")).toThrow(/Invalid PORT/);
    expect(() => parseRunnerPort("65536")).toThrow(/Invalid PORT/);
    expect(() => parseRunnerPort("4001.5")).toThrow(/Invalid PORT/);
  });
});

describe("resolveRunnerServerConfig", () => {
  it("resolves host and port from the environment", () => {
    expect(
      resolveRunnerServerConfig({
        HOST: " 0.0.0.0 ",
        PORT: "4100",
      }),
    ).toEqual({
      host: "0.0.0.0",
      port: 4100,
    });
  });

  it("uses defaults for missing or blank environment values", () => {
    expect(
      resolveRunnerServerConfig({
        HOST: "",
        PORT: "",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4001,
    });
  });
});
