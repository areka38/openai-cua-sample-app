import { describe, expect, it } from "vitest";

import { resolveDefaultMaxResponseTurns } from "./helpers";

describe("resolveDefaultMaxResponseTurns", () => {
  it("falls back to the default when the env value is missing", () => {
    expect(resolveDefaultMaxResponseTurns(undefined)).toBe(24);
  });

  it("uses a valid configured turn budget", () => {
    expect(resolveDefaultMaxResponseTurns("18")).toBe(18);
  });

  it("falls back to the default for invalid values", () => {
    expect(resolveDefaultMaxResponseTurns("not-a-number")).toBe(24);
    expect(resolveDefaultMaxResponseTurns("0")).toBe(24);
    expect(resolveDefaultMaxResponseTurns("99")).toBe(24);
  });
});
