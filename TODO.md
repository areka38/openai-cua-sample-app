# TODO

## Current Goal

Build a local computer-use bridge that lets external CLI agents drive a
Playwright browser session. Target agents include Claude Code CLI, Codex CLI,
Gemini CLI, Cursor, Antigravity-style workflows, and any local tool that can
issue HTTP requests.

Hosted model APIs are not required for this project.

## Done

- Added model-free bridge schemas to `packages/replay-schema`.
- Added `apps/runner/src/bridge.ts` for local Playwright bridge sessions.
- Added runner endpoints:
  - `GET /api/bridge/tools`
  - `POST /api/bridge/sessions`
  - `GET /api/bridge/sessions/:id`
  - `POST /api/bridge/sessions/:id/actions`
  - `DELETE /api/bridge/sessions/:id`
  - `GET /api/bridge/sessions/:id/screenshots/:name`
- Supported bridge actions: `navigate`, `click`, `double_click`, `type_text`,
  `press_key`, `scroll`, `drag`, `wait`, `screenshot`, and `exec_js`.
- Removed hosted model loop code and API-key-gated smoke tests.
- Removed API-key requirements from setup docs and `setup:check`.
- Reframed README/docs/UI copy around `Computer-Use Bridge`.
- Added `docs/agent-bridge.md`.
- Added a dependency-free MCP stdio adapter in `scripts/bridge-mcp.mjs`.
- Added root `pnpm mcp:bridge` script.
- Added MCP adapter unit coverage in `scripts/bridge-mcp.test.mjs`.
- Documented MCP usage in `README.md` and `docs/agent-bridge.md`.

## Current Change Set

- MCP bridge adapter changes are validated.
- Validation completed successfully:
  - `npx -y pnpm@10.26.0 lint`
  - `npx -y pnpm@10.26.0 test`
  - `npx -y pnpm@10.26.0 typecheck`
  - `npx -y pnpm@10.26.0 setup:check`
  - local bridge smoke test against `pnpm dev:runner`
  - local MCP stdio smoke test against `pnpm dev:runner`
  - `npx -y pnpm@10.26.0 build`

## Open Items

- Push is still blocked for the upstream remote unless a writable remote or fork is configured.

## Suggested Next Work

- Add small per-agent connection examples for Claude Code CLI, Codex CLI,
  Gemini CLI, Cursor, and Antigravity once the preferred invocation format is
  confirmed.
