import { mkdir, readFile, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  launchBrowserSession,
  type BrowserSession,
} from "@cua-sample/browser-runtime";
import {
  bridgeActionResultSchema,
  bridgeActionsResponseSchema,
  bridgeSessionSchema,
  browserScreenshotArtifactSchema,
  type BridgeAction,
  type BridgeActionResult,
  type BridgeActionsRequest,
  type BridgeActionsResponse,
  type BridgeCreateSessionRequest,
  type BridgeSession,
  type BridgeToolsResponse,
  type BrowserMode,
  type BrowserScreenshotArtifact,
} from "@cua-sample/replay-schema";
import { RunnerCoreError } from "@cua-sample/runner-core";

type ManagedBridgeSession = {
  browserMode: BrowserMode;
  createdAt: string;
  id: string;
  lastActiveAt: string;
  rootPath: string;
  screenshots: BrowserScreenshotArtifact[];
  screenshotsPath: string;
  session: BrowserSession;
};

type BridgeManagerOptions = {
  dataRoot: string;
  idGenerator?: () => string;
  now?: () => Date;
};

export const bridgeTools: BridgeToolsResponse = {
  service: "computer-use-bridge",
  tools: [
    {
      description: "Create a Playwright-backed browser session for an external CLI agent.",
      name: "create_session",
    },
    {
      description: "Read the current URL, title, viewport, and captured screenshots.",
      name: "read_state",
    },
    {
      description: "Navigate the active page to a URL.",
      name: "navigate",
    },
    {
      description: "Click, double-click, drag, type text, press keys, and scroll.",
      name: "input_actions",
    },
    {
      description: "Capture a PNG screenshot artifact for the external agent.",
      name: "screenshot",
    },
    {
      description: "Evaluate JavaScript in the page for code-capable CLI agents.",
      name: "exec_js",
    },
    {
      description: "Close a browser session and remove its local bridge workspace.",
      name: "close_session",
    },
  ],
};

const defaultStartUrl = "about:blank";
const defaultTargetLabel = "external CLI browser";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export class BridgeManager {
  private readonly dataRoot: string;
  private readonly idGenerator: () => string;
  private readonly now: () => Date;
  private readonly sessions = new Map<string, ManagedBridgeSession>();

  constructor(options: BridgeManagerOptions) {
    this.dataRoot = resolve(options.dataRoot);
    this.idGenerator = options.idGenerator ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  async createSession(input: BridgeCreateSessionRequest = {}): Promise<BridgeSession> {
    const id = this.idGenerator();
    const rootPath = join(this.dataRoot, "bridge-sessions", id);
    const screenshotsPath = join(rootPath, "screenshots");
    const browserMode = input.browserMode ?? "headless";
    const createdAt = this.now().toISOString();

    await mkdir(screenshotsPath, { recursive: true });

    const session = await launchBrowserSession({
      browserMode,
      screenshotDir: screenshotsPath,
      startTarget: {
        kind: "remote_url",
        label: input.targetLabel ?? defaultTargetLabel,
        url: input.startUrl ?? defaultStartUrl,
      },
      workspacePath: rootPath,
    });

    const managed: ManagedBridgeSession = {
      browserMode,
      createdAt,
      id,
      lastActiveAt: createdAt,
      rootPath,
      screenshots: [],
      screenshotsPath,
      session,
    };

    this.sessions.set(id, managed);

    return this.readSession(id);
  }

  async readSession(id: string): Promise<BridgeSession> {
    const managed = this.getSession(id);
    const state = await managed.session.readState();

    return bridgeSessionSchema.parse({
      browserMode: managed.browserMode,
      createdAt: managed.createdAt,
      id: managed.id,
      lastActiveAt: managed.lastActiveAt,
      state: {
        currentUrl: state.currentUrl,
        mode: managed.session.mode,
        pageTitle: state.pageTitle,
        screenshots: managed.screenshots,
        targetLabel: managed.session.targetLabel,
        viewport: managed.session.viewport,
      },
    });
  }

  async executeActions(
    id: string,
    input: BridgeActionsRequest,
  ): Promise<BridgeActionsResponse> {
    const managed = this.getSession(id);
    const results: BridgeActionResult[] = [];

    for (const [index, action] of input.actions.entries()) {
      try {
        const result = await this.executeAction(managed, index, action);
        results.push(result);
      } catch (error) {
        results.push(
          bridgeActionResultSchema.parse({
            error: toErrorMessage(error),
            index,
            ok: false,
            type: action.type,
          }),
        );
        break;
      }
    }

    managed.lastActiveAt = this.now().toISOString();

    return bridgeActionsResponseSchema.parse({
      results,
      session: await this.readSession(id),
    });
  }

  async readScreenshot(id: string, name: string) {
    const managed = this.getSession(id);
    const screenshotPath = join(managed.screenshotsPath, basename(name));

    return readFile(screenshotPath);
  }

  async closeSession(id: string): Promise<BridgeSession> {
    const managed = this.getSession(id);
    const summary = await this.readSession(id);

    this.sessions.delete(id);
    await managed.session.close();
    await rm(managed.rootPath, { force: true, recursive: true });

    return summary;
  }

  async closeAll() {
    await Promise.allSettled(
      Array.from(this.sessions.keys()).map((id) => this.closeSession(id)),
    );
  }

  private async executeAction(
    managed: ManagedBridgeSession,
    index: number,
    action: BridgeAction,
  ): Promise<BridgeActionResult> {
    const { page } = managed.session;

    switch (action.type) {
      case "navigate":
        await page.goto(action.url, { waitUntil: "load" });
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "click":
        await page.mouse.click(action.x, action.y, {
          button: action.button ?? "left",
        });
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "double_click":
        await page.mouse.dblclick(action.x, action.y, {
          button: action.button ?? "left",
        });
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "type_text":
        await page.keyboard.type(action.text);
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "press_key":
        await page.keyboard.press(action.key);
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "scroll":
        await page.mouse.wheel(action.deltaX ?? 0, action.deltaY ?? 0);
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "drag":
        await page.mouse.move(action.startX, action.startY);
        await page.mouse.down();
        await page.mouse.move(action.endX, action.endY);
        await page.mouse.up();
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "wait":
        await page.waitForTimeout(action.ms);
        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          type: action.type,
        });
      case "screenshot": {
        const screenshot = await managed.session.captureScreenshot(
          action.label ?? "bridge-screenshot",
        );
        const artifact = browserScreenshotArtifactSchema.parse({
          capturedAt: screenshot.capturedAt,
          id: screenshot.id,
          label: screenshot.label,
          mimeType: screenshot.mimeType,
          pageTitle: screenshot.pageTitle,
          pageUrl: screenshot.currentUrl,
          path: screenshot.path,
          url: `/api/bridge/sessions/${managed.id}/screenshots/${basename(
            screenshot.path,
          )}`,
        });

        managed.screenshots.push(artifact);

        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          screenshot: artifact,
          type: action.type,
        });
      }
      case "exec_js": {
        const result = await page.evaluate(action.script);

        return bridgeActionResultSchema.parse({
          index,
          ok: true,
          result,
          type: action.type,
        });
      }
      default:
        action satisfies never;
        throw new Error("Unsupported bridge action.");
    }
  }

  private getSession(id: string) {
    const managed = this.sessions.get(id);

    if (!managed) {
      throw new RunnerCoreError(`Bridge session ${id} was not found.`, {
        code: "bridge_session_not_found",
        hint: "Create a bridge session before sending computer-use actions.",
        statusCode: 404,
      });
    }

    return managed;
  }
}
