import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import {
  bridgeActionsResponseSchema,
  bridgeSessionSchema,
  bridgeToolsResponseSchema,
  runDetailSchema,
  runnerErrorResponseSchema,
  scenarioWorkspaceStateSchema,
  scenariosResponseSchema,
  startRunResponseSchema,
} from "@cua-sample/replay-schema";

import type { BridgeManager } from "../src/bridge.js";
import { createServer } from "../src/server.js";

const bridgeSessionFixture = {
  browserMode: "headless",
  createdAt: "2026-06-23T20:36:00.000Z",
  id: "bridge-1",
  lastActiveAt: "2026-06-23T20:36:01.000Z",
  state: {
    currentUrl: "about:blank",
    mode: "headless",
    screenshots: [],
    targetLabel: "fake bridge target",
    viewport: {
      height: 900,
      width: 1440,
    },
  },
};

describe("runner server", () => {
  it("reports health", async () => {
    const app = createServer();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: "ok",
        service: "runner",
      });
    } finally {
      await app.close();
    }
  });

  it("starts, retrieves, stops, and resets scenario workspaces", async () => {
    const dataRoot = await mkdtemp(join(tmpdir(), "cua-sample-runner-server-"));
    const app = createServer({
      dataRoot,
      stepDelayMs: 50,
    });

    try {
      const startResponse = await app.inject({
        method: "POST",
        payload: {
          browserMode: "headless",
          maxResponseTurns: 17,
          mode: "code",
          prompt: [
            "Reorganize the board to match this requested final board state exactly.",
            "",
            "backlog: Refresh workspace docs",
            "in_progress: Close nav bug triage -> Finalize analytics spec",
            "done: Circulate launch brief -> Audit replay artifacts -> Polish stage tooltips",
          ].join("\n"),
          scenarioId: "kanban-reprioritize-sprint",
        },
        url: "/api/runs",
      });

      expect(startResponse.statusCode).toBe(202);
      const started = startRunResponseSchema.parse(startResponse.json());

      const runResponse = await app.inject({
        method: "GET",
        url: `/api/runs/${started.runId}`,
      });

      expect(runResponse.statusCode).toBe(200);
      const detail = runDetailSchema.parse(runResponse.json());

      expect(detail.run.id).toBe(started.runId);
      expect(detail.run.maxResponseTurns).toBe(17);
      expect(detail.run.status).toBe("running");
      expect(detail.run.verificationEnabled).toBe(false);

      const stopResponse = await app.inject({
        method: "POST",
        url: `/api/runs/${started.runId}/stop`,
      });

      expect(stopResponse.statusCode).toBe(200);
      expect(runDetailSchema.parse(stopResponse.json()).run.status).toBe(
        "cancelled",
      );

      const resetResponse = await app.inject({
        method: "POST",
        url: "/api/scenarios/kanban-reprioritize-sprint/reset",
      });

      expect(resetResponse.statusCode).toBe(200);
      expect(
        scenarioWorkspaceStateSchema.parse(resetResponse.json()).scenarioId,
      ).toBe("kanban-reprioritize-sprint");
    } finally {
      await app.close();
    }
  });

  it("serves the validated scenario registry", async () => {
    const app = createServer();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/scenarios",
      });

      expect(response.statusCode).toBe(200);
      expect(scenariosResponseSchema.parse(response.json())).toHaveLength(3);
    } finally {
      await app.close();
    }
  });

  it("serves the computer-use bridge tool registry", async () => {
    const app = createServer();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/bridge/tools",
      });

      expect(response.statusCode).toBe(200);
      expect(bridgeToolsResponseSchema.parse(response.json())).toMatchObject({
        service: "computer-use-bridge",
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "create_session" }),
          expect.objectContaining({ name: "exec_js" }),
        ]),
      });
    } finally {
      await app.close();
    }
  });

  it("routes computer-use bridge session and action requests", async () => {
    const bridgeManager = {
      closeAll: vi.fn(async () => undefined),
      closeSession: vi.fn(async () => bridgeSessionFixture),
      createSession: vi.fn(async () => bridgeSessionFixture),
      executeActions: vi.fn(async () => ({
        results: [
          {
            index: 0,
            ok: true,
            result: "Bridge Test",
            type: "exec_js",
          },
        ],
        session: bridgeSessionFixture,
      })),
      readScreenshot: vi.fn(),
      readSession: vi.fn(async () => bridgeSessionFixture),
    } as unknown as BridgeManager;
    const app = createServer({ bridgeManager });

    try {
      const createResponse = await app.inject({
        method: "POST",
        payload: {
          browserMode: "headless",
          startUrl: "about:blank",
        },
        url: "/api/bridge/sessions",
      });

      expect(createResponse.statusCode).toBe(201);
      expect(bridgeSessionSchema.parse(createResponse.json()).id).toBe("bridge-1");

      const actionsResponse = await app.inject({
        method: "POST",
        payload: {
          actions: [
            {
              script: "document.title",
              type: "exec_js",
            },
          ],
        },
        url: "/api/bridge/sessions/bridge-1/actions",
      });

      expect(actionsResponse.statusCode).toBe(200);
      expect(
        bridgeActionsResponseSchema.parse(actionsResponse.json()).results[0],
      ).toMatchObject({
        ok: true,
        result: "Bridge Test",
        type: "exec_js",
      });
      expect(bridgeManager.createSession).toHaveBeenCalledWith({
        browserMode: "headless",
        startUrl: "about:blank",
      });
      expect(bridgeManager.executeActions).toHaveBeenCalledWith("bridge-1", {
        actions: [
          {
            script: "document.title",
            type: "exec_js",
          },
        ],
      });
    } finally {
      await app.close();
    }
  });

  it("returns the structured error envelope for invalid requests", async () => {
    const app = createServer();

    try {
      const response = await app.inject({
        method: "POST",
        payload: {
          scenarioId: "",
        },
        url: "/api/runs",
      });

      expect(response.statusCode).toBe(400);
      expect(runnerErrorResponseSchema.parse(response.json())).toMatchObject({
        code: "invalid_request",
        hint: expect.stringContaining("published replay-schema contracts"),
      });
    } finally {
      await app.close();
    }
  });

  it("returns the structured error envelope for missing runs", async () => {
    const app = createServer();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/runs/missing-run",
      });

      expect(response.statusCode).toBe(404);
      expect(runnerErrorResponseSchema.parse(response.json())).toMatchObject({
        code: "run_not_found",
        hint: expect.stringContaining("Start a new run"),
      });
    } finally {
      await app.close();
    }
  });
});
