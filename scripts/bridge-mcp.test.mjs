import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createBridgeClient,
  createMcpHandler,
  mcpTools,
  parseStdioJsonLines,
} from "./bridge-mcp.mjs";

describe("bridge MCP adapter", () => {
  it("exposes MCP tools with input schemas", () => {
    const names = mcpTools.map((tool) => tool.name);

    assert.ok(names.includes("create_browser_session"));
    assert.ok(names.includes("screenshot"));
    assert.ok(names.includes("exec_js"));

    for (const tool of mcpTools) {
      assert.equal(tool.inputSchema.type, "object");
    }
  });

  it("handles initialize and tools/list JSON-RPC requests", async () => {
    const handler = createMcpHandler({
      bridgeClient: {},
      serverName: "test-mcp",
      serverVersion: "0.0.0-test",
    });

    assert.deepEqual(
      await handler({
        id: 1,
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
          protocolVersion: "2025-03-26",
        },
      }),
      {
        id: 1,
        jsonrpc: "2.0",
        result: {
          capabilities: {
            tools: {},
          },
          instructions:
            "Use these tools to drive the local browser through the computer-use bridge. Start with create_browser_session.",
          protocolVersion: "2025-03-26",
          serverInfo: {
            name: "test-mcp",
            version: "0.0.0-test",
          },
        },
      },
    );

    const listResponse = await handler({
      id: 2,
      jsonrpc: "2.0",
      method: "tools/list",
    });

    assert.equal(listResponse.id, 2);
    assert.ok(
      listResponse.result.tools.some(
        (tool) => tool.name === "create_browser_session",
      ),
    );
  });

  it("routes tool calls to the bridge client", async () => {
    const calls = [];
    const handler = createMcpHandler({
      bridgeClient: {
        async createSession(input) {
          calls.push(["createSession", input]);

          return {
            browserMode: "headless",
            createdAt: "2026-06-24T00:00:00.000Z",
            id: "session-1",
            lastActiveAt: "2026-06-24T00:00:00.000Z",
            state: {
              currentUrl: "about:blank",
              mode: "headless",
              screenshots: [],
              targetLabel: "test",
              viewport: { height: 900, width: 1440 },
            },
          };
        },
        async executeActions(sessionId, actions) {
          calls.push(["executeActions", sessionId, actions]);

          return {
            results: [
              {
                index: 0,
                ok: true,
                result: "ok",
                type: actions[0].type,
              },
            ],
            session: {
              browserMode: "headless",
              createdAt: "2026-06-24T00:00:00.000Z",
              id: sessionId,
              lastActiveAt: "2026-06-24T00:00:01.000Z",
              state: {
                currentUrl: "https://example.com",
                mode: "headless",
                screenshots: [],
                targetLabel: "test",
                viewport: { height: 900, width: 1440 },
              },
            },
          };
        },
      },
    });

    const createResponse = await handler({
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: {
          browserMode: "headless",
          startUrl: "about:blank",
          targetLabel: "codex-cli",
        },
        name: "create_browser_session",
      },
    });
    const navigateResponse = await handler({
      id: 2,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: {
          sessionId: "session-1",
          url: "https://example.com",
        },
        name: "navigate",
      },
    });

    assert.equal(createResponse.result.isError, false);
    assert.match(createResponse.result.content[0].text, /session-1/);
    assert.equal(navigateResponse.result.isError, false);
    assert.deepEqual(calls, [
      [
        "createSession",
        {
          browserMode: "headless",
          startUrl: "about:blank",
          targetLabel: "codex-cli",
        },
      ],
      [
        "executeActions",
        "session-1",
        [
          {
            type: "navigate",
            url: "https://example.com",
          },
        ],
      ],
    ]);
  });

  it("returns image content for screenshot tool calls", async () => {
    const handler = createMcpHandler({
      bridgeClient: {
        async executeActions(sessionId, actions) {
          return {
            results: [
              {
                index: 0,
                ok: true,
                screenshot: {
                  capturedAt: "2026-06-24T00:00:00.000Z",
                  id: "screenshot-1",
                  label: actions[0].label,
                  mimeType: "image/png",
                  pageUrl: "about:blank",
                  path: "/tmp/001-smoke.png",
                  url: `/api/bridge/sessions/${sessionId}/screenshots/001-smoke.png`,
                },
                type: "screenshot",
              },
            ],
            session: {
              browserMode: "headless",
              createdAt: "2026-06-24T00:00:00.000Z",
              id: sessionId,
              lastActiveAt: "2026-06-24T00:00:01.000Z",
              state: {
                currentUrl: "about:blank",
                mode: "headless",
                screenshots: [],
                targetLabel: "test",
                viewport: { height: 900, width: 1440 },
              },
            },
          };
        },
        async readScreenshot(sessionId, name) {
          assert.equal(sessionId, "session-1");
          assert.equal(name, "001-smoke.png");

          return Buffer.from("png").toString("base64");
        },
      },
    });

    const response = await handler({
      id: 3,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: {
          label: "smoke",
          sessionId: "session-1",
        },
        name: "screenshot",
      },
    });

    assert.equal(response.result.isError, false);
    assert.equal(response.result.content[1].type, "image");
    assert.equal(response.result.content[1].mimeType, "image/png");
  });

  it("creates an HTTP bridge client with the expected requests", async () => {
    const requests = [];
    const client = createBridgeClient({
      baseUrl: "http://runner.local/",
      fetchImpl: async (url, options = {}) => {
        requests.push({ options, url });

        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({ ok: true });
          },
        };
      },
    });

    assert.deepEqual(await client.createSession({ startUrl: "about:blank" }), {
      ok: true,
    });
    assert.deepEqual(
      await client.executeActions("session-1", [{ type: "wait", ms: 1 }]),
      { ok: true },
    );

    assert.equal(requests[0].url, "http://runner.local/api/bridge/sessions");
    assert.equal(requests[0].options.method, "POST");
    assert.equal(
      requests[1].url,
      "http://runner.local/api/bridge/sessions/session-1/actions",
    );
  });

  it("parses newline-delimited stdio JSON-RPC messages", () => {
    const parsed = parseStdioJsonLines(
      '{"jsonrpc":"2.0","id":1,"method":"ping"}\n{"jsonrpc":"2.0"',
    );

    assert.deepEqual(parsed.messages, [
      {
        id: 1,
        jsonrpc: "2.0",
        method: "ping",
      },
    ]);
    assert.equal(parsed.remaining, '{"jsonrpc":"2.0"');
  });
});
