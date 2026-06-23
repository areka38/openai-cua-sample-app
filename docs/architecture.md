# Architecture

The public release branch is a TypeScript monorepo organized around one browser-focused runner pipeline.

## Package Boundaries

### `packages/replay-schema`

Shared contracts for:

- scenario manifests
- run start requests and responses
- replay bundle metadata
- SSE event payloads
- structured runner errors

If an HTTP route or UI state is public, its shape should be defined here first.

### `packages/scenario-kit`

Scenario manifests and default task text for the three public labs:

- kanban
- paint
- booking

This package is the public scenario registry. Adding a new scenario starts here.

### `packages/browser-runtime`

Thin Playwright session abstraction for:

- launching the browser
- resolving the start target
- reading browser state
- capturing screenshots

It does not know about scenario task text, verification, hosted model APIs, or the bridge transport.

### `packages/runner-core`

Core orchestration for:

- mutable run workspaces
- run lifecycle management
- scenario executors
- verification

Scenario execution is separate from the model-free bridge. External CLI agents
should use the runner bridge endpoints when they need direct computer-use access.

### `apps/runner`

Fastify HTTP layer for:

- `GET /api/bridge/tools`
- `POST /api/bridge/sessions`
- `GET /api/bridge/sessions/:id`
- `POST /api/bridge/sessions/:id/actions`
- `DELETE /api/bridge/sessions/:id`
- `POST /api/runs`
- `GET /api/runs/:id`
- `POST /api/runs/:id/stop`
- `GET /api/runs/:id/events`
- `GET /api/runs/:id/replay`
- scenario reset and screenshot artifact routes

This app should stay thin. Scenario logic belongs in `runner-core`; bridge
session logic belongs in the runner's bridge layer.

### `apps/demo-web`

Next.js operator console for:

- selecting a scenario
- starting and stopping runs
- reviewing streamed activity
- scrubbing captured screenshots
- surfacing actionable runner guidance

The UI is split into a hook (`useRunStream`) plus focused presentational components.

## Runtime Flow

1. The operator console requests the public scenario registry from the runner.
2. Starting a run asks `RunnerManager` to create a mutable workspace and replay bundle.
3. `RunnerManager` selects a scenario executor through `executor-registry.ts`.
4. The executor launches the lab and hands control to the configured action loop.
5. The loop emits events, screenshots, and final verification results back into the replay bundle.
6. The web app reads the run detail and follows SSE updates until the run finishes.

## Bridge Flow

1. A CLI agent creates a browser session with `POST /api/bridge/sessions`.
2. The runner launches a local Playwright browser and returns a session id plus browser state.
3. The agent sends action batches to `POST /api/bridge/sessions/:id/actions`.
4. The bridge executes actions locally and returns updated state, JavaScript results, and screenshot artifact URLs.
5. The agent closes the session with `DELETE /api/bridge/sessions/:id`.

## Extensibility

The public branch intentionally exposes only three scenarios, but the architecture is meant to be forked:

- add a manifest in `scenario-kit`
- add a verifier and instructions in `runner-core`
- register the executor in `executor-registry.ts`
- add a lab template under `labs`

That path is documented in [docs/contributing.md](./contributing.md).
