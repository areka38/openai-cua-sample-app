# Computer-Use Bridge

TypeScript browser runtime for connecting external CLI agents to computer-use.
The target clients are tools such as Claude Code CLI, Codex CLI, Gemini CLI,
Cursor, and Antigravity. The repo includes:

- `apps/demo-web`: a Next.js operator console for reviewing screenshots, events, and replay artifacts
- `apps/runner`: a Fastify runner that exposes scenario APIs and a model-free `/api/bridge/*` computer-use bridge
- `packages/*`: shared scenario, runtime, and contract packages that make it easy to add new labs later

The legacy Python sample does not ship in this release branch. Keep that history on a separate `v1` or `legacy` branch.

## What This Repo Demonstrates

- how to expose a local Playwright browser as computer-use actions over HTTP
- how external CLI agents can drive the same browser session with navigate, click, type, key, scroll, drag, screenshot, and JavaScript actions
- how to define scenario manifests, launch isolated run workspaces, and verify outcomes
- how to build an operator-facing console that is understandable even when the runner is offline or a run fails

## Prerequisites

- Node.js `22.20.0`
- pnpm `10.26.0`
- Playwright Chromium browser install

## First Run

```bash
git clone <repo-url>
cd <repo-directory>
corepack enable
pnpm install
```

If `corepack enable` cannot install pnpm shims on your machine, run the pinned
pnpm version through `npx` instead:

```bash
npx -y pnpm@10.26.0 install
npx -y pnpm@10.26.0 setup:check
npx -y pnpm@10.26.0 dev
```

No API key is required. The runner and bridge use local Playwright. If you need
to override local ports or default labels, copy `.env.example` to `.env` and edit
those optional values. The web app uses its built-in defaults; if you need to
override `NEXT_PUBLIC_*` settings, add them in `apps/demo-web/.env.local`.

If `pnpm install` prints an `Ignored build scripts` warning for optional packages such as `sharp` or `esbuild`, you can ignore it for local development in this repo. A clean clone still installs, builds, and starts successfully without approving those scripts.

Install the Playwright browser:

```bash
pnpm playwright:install
```

On Linux, install Playwright OS dependencies as well:

```bash
pnpm playwright:install:with-deps
```

If Playwright later reports missing system libraries, rerun the `with-deps` command above and follow any OS package prompts it prints.

Check local setup before starting the apps:

```bash
pnpm setup:check
```

Start both apps together:

```bash
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000), choose a scenario, keep `Headless` selected, and start a run.

## CLI Bridge API

External agents do not need hosted model APIs. They only need to talk to the
runner bridge:

```bash
curl http://127.0.0.1:4001/api/bridge/tools
```

Create a browser session:

```bash
curl -s http://127.0.0.1:4001/api/bridge/sessions \
  -H 'content-type: application/json' \
  -d '{"browserMode":"headless","startUrl":"about:blank","targetLabel":"codex-cli"}'
```

Send computer-use actions to the returned session id:

```bash
curl -s http://127.0.0.1:4001/api/bridge/sessions/<session-id>/actions \
  -H 'content-type: application/json' \
  -d '{
    "actions": [
      {"type":"navigate","url":"https://example.com"},
      {"type":"screenshot","label":"loaded"}
    ]
  }'
```

Supported actions are `navigate`, `click`, `double_click`, `type_text`,
`press_key`, `scroll`, `drag`, `wait`, `screenshot`, and `exec_js`.

See [docs/agent-bridge.md](docs/agent-bridge.md) for the bridge contract and
agent integration notes.

For tools that prefer MCP stdio, run the adapter after the runner is started:

```bash
pnpm mcp:bridge
```

The adapter exposes the same browser controls as MCP tools and forwards calls to
`RUNNER_BASE_URL` or `COMPUTER_USE_BRIDGE_URL` when either environment variable
is set.

## Local Development

Run the services separately if you want independent logs:

```bash
pnpm dev:runner
RUNNER_BASE_URL=http://127.0.0.1:4001 pnpm dev:web
```

Common checks:

```bash
pnpm setup:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

### Interpreting `pnpm setup:check`

`pnpm setup:check` is a local preflight check for the browser runtime. It does
not require `.env` or any hosted-model API key.

Common failures:

- `Playwright Chromium is not installed`
  Run `pnpm playwright:install`. On Linux, use `pnpm playwright:install:with-deps` if system libraries are missing.
- `PORT must be an integer between 1 and 65535`
  Update `PORT` in `.env` if you created local overrides.
- `NEXT_PUBLIC_CUA_DEFAULT_MAX_RESPONSE_TURNS must be an integer between 1 and 50`
  Update the web turn budget in `.env` or `apps/demo-web/.env.local`.

To validate the checked-in template, run:

```bash
pnpm setup:check -- --env-file .env.example
```

## Scenario Runner Modes

- `native`: maps computer-use actions such as click, drag, type, wait, and screenshot to the browser runtime.
- `code`: exposes a JavaScript path through `exec_js` for code-capable CLI agents.

The `/api/bridge/*` endpoints are the model-free integration point. Scenario
manifests and replay artifacts remain useful for local labs, verification, and
operator review.

## Official Scenarios

- `kanban-reprioritize-sprint` (`kanban`): stateful drag-and-drop verification against a target board state
- `paint-draw-poster` (`paint`): cursor control, drawing, and saved canvas verification
- `booking-complete-reservation` (`booking`): multi-step browsing and form completion with local confirmation verification

More detail lives in [docs/scenarios.md](docs/scenarios.md).

## Repo Map

- `apps/demo-web`
  The operator console UI
- `apps/runner`
  The HTTP runner, SSE endpoints, and artifact serving layer
- `packages/replay-schema`
  Shared request, response, replay, and error contracts
- `packages/scenario-kit`
  Public scenario manifests and default task text
- `packages/browser-runtime`
  Playwright session abstraction
- `packages/runner-core`
  Orchestration, Responses loop, scenario executors, and verification
- `labs`
  Static lab templates copied into run-scoped workspaces
- `docs`
  Architecture, scenarios, and contribution guidance

## Environment Variables

Runner:

- `HOST` (default `127.0.0.1`)
- `PORT` (default `4001`)
- `COMPUTER_USE_DEFAULT_AGENT` (default `external-cli`)

Web:

- `RUNNER_BASE_URL` (default `http://127.0.0.1:4001`)
- `NEXT_PUBLIC_CUA_DEFAULT_MODEL` (default `external-cli`)
- `NEXT_PUBLIC_CUA_DEFAULT_MAX_RESPONSE_TURNS` (default `24`)

See [.env.example](.env.example) for a minimal local template.

## Safety And Limitations

- Computer use remains high risk. Do not point this sample at authenticated, financial, medical, or otherwise high-stakes environments.
- This repo is intentionally browser-focused. Workspace patching and file-editing scenarios are out of scope for the OSS release branch.
- The bridge executes local browser actions requested by whichever CLI agent you connect. Treat those agents as untrusted automation unless you control the task and target.
- The public scenarios are local labs designed for deterministic verification. They are not intended as proofs of general web autonomy.

## Release Validation Checklist

- clean clone on a fresh machine
- setup succeeds from this README alone
- `pnpm dev`
- one successful `/api/bridge/sessions` creation
- one successful bridge `screenshot` action
- one successful headless bridge session
- one successful headful bridge session
- one intentional failure that shows the new runner guidance cleanly
