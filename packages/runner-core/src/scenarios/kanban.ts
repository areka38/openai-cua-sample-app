import { type ExecutionMode } from "@cua-sample/replay-schema";

import {
  failLiveResponsesUnavailable,
  type RunExecutionContext,
  type RunExecutor,
} from "../scenario-runtime.js";

const bridgeRequiredMessage =
  "Kanban lab requires an external CLI agent bridge. Hosted API fallback is intentionally not required.";

class KanbanCodeExecutor implements RunExecutor {
  async execute(context: RunExecutionContext) {
    await failLiveResponsesUnavailable(context, bridgeRequiredMessage);
  }
}

class KanbanNativeExecutor implements RunExecutor {
  async execute(context: RunExecutionContext) {
    await failLiveResponsesUnavailable(context, bridgeRequiredMessage);
  }
}

export function createKanbanExecutor(mode: ExecutionMode): RunExecutor {
  return mode === "code" ? new KanbanCodeExecutor() : new KanbanNativeExecutor();
}
