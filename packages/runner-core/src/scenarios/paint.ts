import { type ExecutionMode } from "@cua-sample/replay-schema";

import {
  failLiveResponsesUnavailable,
  type RunExecutionContext,
  type RunExecutor,
} from "../scenario-runtime.js";

const bridgeRequiredMessage =
  "Paint lab requires an external CLI agent bridge. Hosted API fallback is intentionally not required.";

class PaintCodeExecutor implements RunExecutor {
  async execute(context: RunExecutionContext) {
    await failLiveResponsesUnavailable(context, bridgeRequiredMessage);
  }
}

class PaintNativeExecutor implements RunExecutor {
  async execute(context: RunExecutionContext) {
    await failLiveResponsesUnavailable(context, bridgeRequiredMessage);
  }
}

export function createPaintExecutor(mode: ExecutionMode): RunExecutor {
  return mode === "code" ? new PaintCodeExecutor() : new PaintNativeExecutor();
}
