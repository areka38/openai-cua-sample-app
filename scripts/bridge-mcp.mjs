#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const protocolVersion = "2025-03-26";
const defaultBridgeBaseUrl =
  process.env.COMPUTER_USE_BRIDGE_URL ??
  process.env.RUNNER_BASE_URL ??
  "http://127.0.0.1:4001";

function jsonSchemaObject(properties, required = []) {
  return {
    additionalProperties: false,
    properties,
    required,
    type: "object",
  };
}

const browserModeSchema = {
  enum: ["headless", "headful"],
  type: "string",
};

const actionResultSchemaDescription =
  "Returns the runner bridge JSON response as formatted text. Screenshot calls also return image content when the bridge artifact can be fetched.";

export const mcpTools = [
  {
    description: "Create a local Playwright browser session for a CLI agent.",
    inputSchema: jsonSchemaObject({
      browserMode: browserModeSchema,
      startUrl: {
        description: "Initial URL. Defaults to about:blank.",
        type: "string",
      },
      targetLabel: {
        description: "Human-readable session label.",
        type: "string",
      },
    }),
    name: "create_browser_session",
  },
  {
    description: "Read the current browser URL, title, viewport, and screenshots.",
    inputSchema: jsonSchemaObject(
      {
        sessionId: { type: "string" },
      },
      ["sessionId"],
    ),
    name: "read_browser_state",
  },
  {
    description: "Close a browser session and remove its local bridge workspace.",
    inputSchema: jsonSchemaObject(
      {
        sessionId: { type: "string" },
      },
      ["sessionId"],
    ),
    name: "close_browser_session",
  },
  {
    description: `Navigate the session page to a URL. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        sessionId: { type: "string" },
        url: { type: "string" },
      },
      ["sessionId", "url"],
    ),
    name: "navigate",
  },
  {
    description: `Click at viewport coordinates. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        button: {
          enum: ["left", "middle", "right"],
          type: "string",
        },
        sessionId: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
      },
      ["sessionId", "x", "y"],
    ),
    name: "click",
  },
  {
    description: `Double-click at viewport coordinates. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        button: {
          enum: ["left", "middle", "right"],
          type: "string",
        },
        sessionId: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
      },
      ["sessionId", "x", "y"],
    ),
    name: "double_click",
  },
  {
    description: `Type text using the active keyboard focus. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        sessionId: { type: "string" },
        text: { type: "string" },
      },
      ["sessionId", "text"],
    ),
    name: "type_text",
  },
  {
    description: `Press a keyboard key, for example Enter, Tab, Escape, or Control+A. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        key: { type: "string" },
        sessionId: { type: "string" },
      },
      ["sessionId", "key"],
    ),
    name: "press_key",
  },
  {
    description: `Scroll by wheel deltas. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        deltaX: { type: "number" },
        deltaY: { type: "number" },
        sessionId: { type: "string" },
      },
      ["sessionId"],
    ),
    name: "scroll",
  },
  {
    description: `Drag from one viewport coordinate to another. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        endX: { type: "number" },
        endY: { type: "number" },
        sessionId: { type: "string" },
        startX: { type: "number" },
        startY: { type: "number" },
      },
      ["sessionId", "startX", "startY", "endX", "endY"],
    ),
    name: "drag",
  },
  {
    description: `Wait inside the browser session. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        ms: {
          maximum: 60000,
          minimum: 0,
          type: "integer",
        },
        sessionId: { type: "string" },
      },
      ["sessionId", "ms"],
    ),
    name: "wait",
  },
  {
    description: "Capture a PNG screenshot and return text plus image content.",
    inputSchema: jsonSchemaObject(
      {
        label: { type: "string" },
        sessionId: { type: "string" },
      },
      ["sessionId"],
    ),
    name: "screenshot",
  },
  {
    description: `Evaluate JavaScript in the page. Use only for controlled pages. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        script: { type: "string" },
        sessionId: { type: "string" },
      },
      ["sessionId", "script"],
    ),
    name: "exec_js",
  },
  {
    description: `Send a raw batch of bridge actions. ${actionResultSchemaDescription}`,
    inputSchema: jsonSchemaObject(
      {
        actions: {
          items: { type: "object" },
          maxItems: 25,
          minItems: 1,
          type: "array",
        },
        sessionId: { type: "string" },
      },
      ["sessionId", "actions"],
    ),
    name: "computer_use_batch",
  },
];

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function toPrettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function createTextResult(value, isError = false) {
  return {
    content: [
      {
        text: typeof value === "string" ? value : toPrettyJson(value),
        type: "text",
      },
    ],
    isError,
  };
}

function createJsonRpcResult(id, result) {
  return {
    id,
    jsonrpc: "2.0",
    result,
  };
}

function createJsonRpcError(id, code, message, data) {
  return {
    error: {
      code,
      ...(data === undefined ? {} : { data }),
      message,
    },
    id,
    jsonrpc: "2.0",
  };
}

function requireString(args, name) {
  const value = args?.[name];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }

  return value;
}

function optionalNumber(args, name, fallback) {
  const value = args?.[name];

  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }

  return value;
}

function requireNumber(args, name) {
  const value = optionalNumber(args, name);

  if (value === undefined) {
    throw new Error(`${name} must be a finite number.`);
  }

  return value;
}

function optionalString(args, name) {
  const value = args?.[name];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${name} must be a string.`);
  }

  return value;
}

function pickSessionId(args) {
  return requireString(args, "sessionId");
}

function actionFromTool(name, args) {
  switch (name) {
    case "navigate":
      return {
        type: "navigate",
        url: requireString(args, "url"),
      };
    case "click":
      return {
        ...(optionalString(args, "button") ? { button: optionalString(args, "button") } : {}),
        type: "click",
        x: requireNumber(args, "x"),
        y: requireNumber(args, "y"),
      };
    case "double_click":
      return {
        ...(optionalString(args, "button") ? { button: optionalString(args, "button") } : {}),
        type: "double_click",
        x: requireNumber(args, "x"),
        y: requireNumber(args, "y"),
      };
    case "type_text":
      return {
        text: requireString(args, "text"),
        type: "type_text",
      };
    case "press_key":
      return {
        key: requireString(args, "key"),
        type: "press_key",
      };
    case "scroll":
      return {
        deltaX: optionalNumber(args, "deltaX", 0),
        deltaY: optionalNumber(args, "deltaY", 0),
        type: "scroll",
      };
    case "drag":
      return {
        endX: requireNumber(args, "endX"),
        endY: requireNumber(args, "endY"),
        startX: requireNumber(args, "startX"),
        startY: requireNumber(args, "startY"),
        type: "drag",
      };
    case "wait":
      return {
        ms: requireNumber(args, "ms"),
        type: "wait",
      };
    case "screenshot":
      return {
        ...(optionalString(args, "label") ? { label: optionalString(args, "label") } : {}),
        type: "screenshot",
      };
    case "exec_js":
      return {
        script: requireString(args, "script"),
        type: "exec_js",
      };
    default:
      throw new Error(`Unsupported action tool: ${name}`);
  }
}

async function readJsonResponse(response) {
  const body = await response.text();

  try {
    return body ? JSON.parse(body) : null;
  } catch {
    return body;
  }
}

export function createBridgeClient({
  baseUrl = defaultBridgeBaseUrl,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const normalizedBaseUrl = stripTrailingSlash(baseUrl);

  async function request(path, options = {}) {
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...(options.headers ?? {}),
      },
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        `Bridge HTTP ${response.status}: ${
          typeof payload === "string" ? payload : toPrettyJson(payload)
        }`,
      );
    }

    return payload;
  }

  return {
    baseUrl: normalizedBaseUrl,
    closeSession(sessionId) {
      return request(`/api/bridge/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
    },
    createSession(input) {
      return request("/api/bridge/sessions", {
        body: JSON.stringify(input ?? {}),
        method: "POST",
      });
    },
    executeActions(sessionId, actions) {
      return request(`/api/bridge/sessions/${encodeURIComponent(sessionId)}/actions`, {
        body: JSON.stringify({ actions }),
        method: "POST",
      });
    },
    readSession(sessionId) {
      return request(`/api/bridge/sessions/${encodeURIComponent(sessionId)}`);
    },
    async readScreenshot(sessionId, name) {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/api/bridge/sessions/${encodeURIComponent(
          sessionId,
        )}/screenshots/${encodeURIComponent(name)}`,
      );

      if (!response.ok) {
        throw new Error(`Bridge screenshot HTTP ${response.status}.`);
      }

      return Buffer.from(await response.arrayBuffer()).toString("base64");
    },
  };
}

function screenshotNameFromActionResponse(response) {
  const screenshotUrl = response?.results?.find(
    (result) => result?.type === "screenshot",
  )?.screenshot?.url;

  if (typeof screenshotUrl !== "string") {
    return null;
  }

  return screenshotUrl.split("/").filter(Boolean).at(-1) ?? null;
}

async function callBridgeTool(bridgeClient, name, args = {}) {
  if (name === "create_browser_session") {
    return createTextResult(
      await bridgeClient.createSession({
        ...(optionalString(args, "browserMode")
          ? { browserMode: optionalString(args, "browserMode") }
          : {}),
        ...(optionalString(args, "startUrl")
          ? { startUrl: optionalString(args, "startUrl") }
          : {}),
        ...(optionalString(args, "targetLabel")
          ? { targetLabel: optionalString(args, "targetLabel") }
          : {}),
      }),
    );
  }

  if (name === "read_browser_state") {
    return createTextResult(await bridgeClient.readSession(pickSessionId(args)));
  }

  if (name === "close_browser_session") {
    return createTextResult(await bridgeClient.closeSession(pickSessionId(args)));
  }

  if (name === "computer_use_batch") {
    const actions = args?.actions;

    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error("actions must be a non-empty array.");
    }

    return createTextResult(
      await bridgeClient.executeActions(pickSessionId(args), actions),
    );
  }

  if (mcpTools.some((tool) => tool.name === name)) {
    const sessionId = pickSessionId(args);
    const actionResponse = await bridgeClient.executeActions(sessionId, [
      actionFromTool(name, args),
    ]);
    const result = createTextResult(actionResponse);

    if (name === "screenshot") {
      const screenshotName = screenshotNameFromActionResponse(actionResponse);

      if (screenshotName) {
        const data = await bridgeClient.readScreenshot(sessionId, screenshotName);
        result.content.push({
          data,
          mimeType: "image/png",
          type: "image",
        });
      }
    }

    return result;
  }

  throw new Error(`Unknown tool: ${name}`);
}

export function createMcpHandler({
  bridgeClient = createBridgeClient(),
  serverName = "computer-use-bridge-mcp",
  serverVersion = "0.1.0",
} = {}) {
  return async function handleMessage(message) {
    if (Array.isArray(message)) {
      const responses = (
        await Promise.all(message.map((item) => handleMessage(item)))
      ).filter(Boolean);

      return responses.length > 0 ? responses : undefined;
    }

    if (!message || message.jsonrpc !== "2.0") {
      return createJsonRpcError(null, -32600, "Invalid JSON-RPC message.");
    }

    const { id, method, params } = message;
    const isNotification = id === undefined;

    try {
      switch (method) {
        case "initialize":
          return createJsonRpcResult(id, {
            capabilities: {
              tools: {},
            },
            instructions:
              "Use these tools to drive the local browser through the computer-use bridge. Start with create_browser_session.",
            protocolVersion,
            serverInfo: {
              name: serverName,
              version: serverVersion,
            },
          });
        case "notifications/initialized":
          return undefined;
        case "ping":
          return isNotification ? undefined : createJsonRpcResult(id, {});
        case "tools/list":
          return createJsonRpcResult(id, {
            tools: mcpTools,
          });
        case "tools/call": {
          const name = params?.name;

          if (typeof name !== "string") {
            throw new Error("tools/call requires params.name.");
          }

          const result = await callBridgeTool(
            bridgeClient,
            name,
            params?.arguments ?? {},
          );

          return createJsonRpcResult(id, result);
        }
        default:
          return isNotification
            ? undefined
            : createJsonRpcError(id, -32601, `Method not found: ${method}`);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);

      if (method === "tools/call") {
        return createJsonRpcResult(id, createTextResult(messageText, true));
      }

      return createJsonRpcError(id, -32603, messageText);
    }
  };
}

export function parseStdioJsonLines(chunk, buffer = "") {
  const nextBuffer = buffer + chunk;
  const lines = nextBuffer.split(/\r?\n/);

  return {
    messages: lines
      .slice(0, -1)
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line)),
    remaining: lines.at(-1) ?? "",
  };
}

export async function runStdioServer({
  input = process.stdin,
  output = process.stdout,
  error = process.stderr,
  handler = createMcpHandler(),
} = {}) {
  let buffer = "";

  input.setEncoding("utf8");

  for await (const chunk of input) {
    try {
      const parsed = parseStdioJsonLines(chunk, buffer);
      buffer = parsed.remaining;

      for (const message of parsed.messages) {
        const response = await handler(message);

        if (response !== undefined) {
          output.write(`${JSON.stringify(response)}\n`);
        }
      }
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : String(parseError);

      error.write(`Invalid MCP stdio message: ${message}\n`);
      output.write(`${JSON.stringify(createJsonRpcError(null, -32700, message))}\n`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runStdioServer();
}
