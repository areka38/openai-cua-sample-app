import { type ExecutionMode } from "@cua-sample/replay-schema";

import {
  failLiveResponsesUnavailable,
  type RunExecutionContext,
  type RunExecutor,
} from "../scenario-runtime.js";

const bridgeRequiredMessage =
  "Booking lab requires an external CLI agent bridge. Hosted API fallback is intentionally not required.";

class BookingCodeExecutor implements RunExecutor {
  async execute(context: RunExecutionContext) {
    await failLiveResponsesUnavailable(context, bridgeRequiredMessage);
  }
}

class BookingNativeExecutor implements RunExecutor {
  async execute(context: RunExecutionContext) {
    await failLiveResponsesUnavailable(context, bridgeRequiredMessage);
  }
}

export function createBookingExecutor(mode: ExecutionMode): RunExecutor {
  return mode === "code" ? new BookingCodeExecutor() : new BookingNativeExecutor();
}
