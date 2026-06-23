# Agent Bridge

The bridge is the model-free integration surface for external CLI agents. It
does not call OpenAI, Anthropic, Google, Cursor, or Antigravity APIs. Those tools
remain the agent process; this repo supplies the browser computer-use runtime.

## Target Agents

- Claude Code CLI
- Codex CLI
- Gemini CLI
- Cursor agent workflows
- Antigravity-style agent workflows
- Any local tool that can issue HTTP requests

## Transport

The first supported transport is HTTP from `apps/runner`:

- `GET /api/bridge/tools`
- `POST /api/bridge/sessions`
- `GET /api/bridge/sessions/:id`
- `POST /api/bridge/sessions/:id/actions`
- `DELETE /api/bridge/sessions/:id`
- `GET /api/bridge/sessions/:id/screenshots/:name`

This keeps the runtime easy to drive from shell commands today. An MCP adapter
can sit on top of the same contracts later for tools that prefer MCP.

## Action Contract

Send action batches to `POST /api/bridge/sessions/:id/actions`:

```json
{
  "actions": [
    { "type": "navigate", "url": "https://example.com" },
    { "type": "click", "x": 420, "y": 240 },
    { "type": "type_text", "text": "hello" },
    { "type": "press_key", "key": "Enter" },
    { "type": "screenshot", "label": "after-submit" }
  ]
}
```

Supported action types:

- `navigate`
- `click`
- `double_click`
- `type_text`
- `press_key`
- `scroll`
- `drag`
- `wait`
- `screenshot`
- `exec_js`

## Minimal Flow

1. Start the runner with `pnpm dev:runner`.
2. Create a bridge session with `POST /api/bridge/sessions`.
3. Give the returned session id to the agent.
4. The agent loops over screenshot/state inspection and action batches.
5. Close the session with `DELETE /api/bridge/sessions/:id`.

## Safety

The bridge executes browser actions locally. Do not connect it to authenticated,
financial, medical, or otherwise high-stakes browser sessions unless the target
and task are explicitly controlled.
