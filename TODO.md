# TODO

## Operating Rules

- At the start of each work cycle, read this file and `git status`.
- Work on one small, verifiable implementation item at a time.
- Before ending a cycle, record changed files, commands run, validation results, and remaining work here.
- Requested cadence is 45-minute cycles while this Codex session is active or resumed. No external scheduler is configured in the repo.

## Done

- Cloned `https://github.com/openai/openai-cua-sample-app.git` into this workspace.
- Read the main repo docs and structure:
  - `README.md`
  - `docs/architecture.md`
  - `docs/scenarios.md`
- Installed dependencies with `npx -y pnpm@10.26.0 install`.
- Ran the full test suite successfully with `npx -y pnpm@10.26.0 test`.
- Ran lint successfully with `npx -y pnpm@10.26.0 lint`.
- Hardened demo web parsing for `NEXT_PUBLIC_CUA_DEFAULT_MAX_RESPONSE_TURNS`.
- Added unit coverage for valid, missing, and invalid default turn-budget values.
- Hardened runner `PORT` and `HOST` environment parsing.
- Added runner config unit coverage for default, valid, and invalid environment values.
- Added an opt-in `pnpm setup:check` command for local prerequisite validation.
- Documented `pnpm setup:check` in the first-run and local-development README flows.
- Installed Playwright Chromium into the local Playwright cache.
- Fixed `setup:check` so it resolves Playwright from the runner workspace package.
- Added automated tests for setup checker parsing and validation helpers.
- Wired setup checker tests into the root `pnpm test` command.
- Added README guidance for interpreting `pnpm setup:check` failures.
- Fixed runner dev startup when repo-root `.env` is missing.
- Verified `pnpm dev` starts both runner and web locally without `.env` for non-live UI/scenario browsing.
- Ignored local `.env.local` files and environment-specific local env variants while keeping `.env.example` tracked.
- Committed setup validation and runner config work locally as `ec962ed`.
- Confirmed `origin/main` had no newer commits before publishing attempt.
- Documented `npx -y pnpm@10.26.0` as a fallback when `corepack enable` cannot install pnpm shims.

## Cycle Log

### 2026-06-22 20:27 UTC

- Read `TODO.md`, `git status`, `package.json`, runner entrypoint, runner tests, and runner package config.
- Selected the open item "Add similar env validation on the runner entrypoint for `PORT`."
- Added `apps/runner/src/config.ts` with `parseRunnerPort` and `resolveRunnerServerConfig`.
- Updated `apps/runner/src/index.ts` to use validated runner server config before listening.
- Added `apps/runner/test/config.test.ts` covering missing, blank, valid, and invalid `PORT` values plus `HOST` defaults.
- Verified runner tests with `npx -y pnpm@10.26.0 --filter @cua-sample/runner test`.
- Verified lint with `npx -y pnpm@10.26.0 lint`.
- Verified full typecheck with `npx -y pnpm@10.26.0 typecheck`.
- Verified full test suite with `npx -y pnpm@10.26.0 test`.
- Verified production build with `npx -y pnpm@10.26.0 build`.

### 2026-06-22 20:34 UTC

- Read `TODO.md`, `git status`, `.env.example`, README setup guidance, package scripts, and setup-related source references.
- Selected the open item "Add `.env.example` driven setup checks or clearer startup guidance for missing local prerequisites."
- Added `scripts/setup-check.mjs`.
- Added root `package.json` script `setup:check`.
- Updated `README.md` to run `pnpm setup:check` before app startup and list it in common checks.
- Verified successful fixture path with `npx -y pnpm@10.26.0 setup:check -- --env-file .env.example --allow-placeholder-key --skip-playwright`.
- Verified real local setup check with `npx -y pnpm@10.26.0 setup:check`; it fails as expected because `.env` and Playwright Chromium are not installed locally yet.
- Verified lint with `npx -y pnpm@10.26.0 lint`.
- Verified full typecheck with `npx -y pnpm@10.26.0 typecheck`.
- Verified full test suite with `npx -y pnpm@10.26.0 test`.
- Verified production build with `npx -y pnpm@10.26.0 build`.

### 2026-06-22 20:40 UTC

- Read `TODO.md`, `git status`, current `setup:check` output, and `scripts/setup-check.mjs`.
- Selected the open item "Playwright Chromium has not been installed yet."
- Installed Playwright Chromium with `npx -y pnpm@10.26.0 playwright:install`.
- Found that `setup:check` still reported Chromium missing because the root script could not import the workspace-local `playwright` dependency.
- Updated `scripts/setup-check.mjs` to resolve `playwright` from `apps/runner/package.json` using `createRequire`.
- Verified real local setup check with `npx -y pnpm@10.26.0 setup:check`; it now reports Playwright Chromium as installed and only fails because `.env` is missing.
- Verified fixture setup check with `npx -y pnpm@10.26.0 setup:check -- --env-file .env.example --allow-placeholder-key`.
- Verified Chromium launch with a direct `node -e` Playwright smoke script that opened a headless page and read title `smoke`.
- Verified browser-runtime tests with `npx -y pnpm@10.26.0 --filter @cua-sample/browser-runtime test`.
- Verified lint with `npx -y pnpm@10.26.0 lint`.
- Verified full typecheck with `npx -y pnpm@10.26.0 typecheck`.
- Verified full test suite with `npx -y pnpm@10.26.0 test`.
- Verified production build with `npx -y pnpm@10.26.0 build`.

### 2026-06-22 20:45 UTC

- Read `TODO.md`, `git status`, current `setup:check` output, and `scripts/setup-check.mjs`.
- Selected the untracked gap that `setup:check` had no automated behavior tests.
- Exported setup checker helper functions from `scripts/setup-check.mjs`.
- Guarded the setup checker CLI `main()` call so the module can be imported without executing the checker.
- Added `scripts/setup-check.test.mjs` using Node's built-in test runner.
- Added root `package.json` script `test:setup`.
- Updated root `pnpm test` to run `test:setup` before package test suites.
- Verified targeted setup tests with `npx -y pnpm@10.26.0 test:setup`.
- Verified fixture setup check with `npx -y pnpm@10.26.0 setup:check -- --env-file .env.example --allow-placeholder-key`.
- Verified real local setup check with `npx -y pnpm@10.26.0 setup:check`; it still fails as expected only because `.env` is missing.
- Verified lint with `npx -y pnpm@10.26.0 lint`.
- Verified full test suite with `npx -y pnpm@10.26.0 test`, including the new `test:setup` step.
- Verified production build with `npx -y pnpm@10.26.0 build`.
- Re-ran full typecheck with `npx -y pnpm@10.26.0 typecheck` after build completed. The first parallel typecheck raced with `next build` over `.next/types`; the sequential rerun passed.

### 2026-06-22 20:48 UTC

- Read `TODO.md`, `git status`, `setup:check` output, `responses-loop.ts`, `scenario-runtime.ts`, and README setup sections.
- Confirmed live scenario execution still requires a real `OPENAI_API_KEY`; `.env` cannot be completed without a user-provided secret.
- Selected the open item "Consider adding a lightweight docs section for interpreting `pnpm setup:check` failures."
- Added README guidance for common `pnpm setup:check` failures: missing `.env`, placeholder API key, missing Playwright Chromium, invalid `PORT`, and invalid web turn budget.
- Added the template validation command `pnpm setup:check -- --env-file .env.example --allow-placeholder-key` to README.
- Verified `npx -y pnpm@10.26.0 setup:check -- --help`.
- Verified fixture setup check with `npx -y pnpm@10.26.0 setup:check -- --env-file .env.example --allow-placeholder-key`.
- Verified real local setup check with `npx -y pnpm@10.26.0 setup:check`; it fails as expected only because `.env` is missing.
- Verified lint with `npx -y pnpm@10.26.0 lint`.
- Verified full test suite with `npx -y pnpm@10.26.0 test`.
- Verified production build with `npx -y pnpm@10.26.0 build`.
- Verified full typecheck with `npx -y pnpm@10.26.0 typecheck` after build completed.

### 2026-06-22 20:55 UTC

- Read `TODO.md`, `git status`, current port listeners, and runner/web dev package scripts.
- Selected the open item "The local dev server has not been started yet."
- Attempted root `npx -y pnpm@10.26.0 dev` and found a real runner dev bug: Node watch mode failed with `ENOENT` while trying to watch missing repo-root `.env`.
- Added `apps/runner/scripts/dev.mjs` to include `--env-file=<repo>/.env` only when `.env` exists.
- Updated `apps/runner/package.json` dev script to use `node scripts/dev.mjs`.
- Added `apps/runner/test/dev-script.test.mjs` covering env-file argument inclusion and omission.
- Verified runner dev script directly with `npx -y pnpm@10.26.0 --filter @cua-sample/runner dev`; runner listened on `http://127.0.0.1:4001` without `.env`.
- Verified runner health endpoint with `curl -fsS http://127.0.0.1:4001/health`.
- Verified runner scenario registry returned 3 scenarios: `kanban-reprioritize-sprint`, `paint-draw-poster`, and `booking-complete-reservation`.
- Verified web dev script directly with `npx -y pnpm@10.26.0 --filter @cua-sample/demo-web dev`.
- Verified web page at `http://127.0.0.1:3000` rendered `GPT-5.4 CUA Sample App`, `Runner Online`, and `Launch Planner`.
- Stopped direct runner/web dev services and verified ports `3000` and `4001` were clear.
- Verified root `npx -y pnpm@10.26.0 dev` starts both runner and web together.
- Verified root dev runner health, scenario registry, and web page output.
- Stopped root dev services and verified ports were clear.
- Verified runner tests with `npx -y pnpm@10.26.0 --filter @cua-sample/runner test`.
- Verified lint with `npx -y pnpm@10.26.0 lint`.
- Verified full test suite with `npx -y pnpm@10.26.0 test`.
- Verified full typecheck with `npx -y pnpm@10.26.0 typecheck`.
- Verified production build with `npx -y pnpm@10.26.0 build`.

### 2026-06-22 21:00 UTC

- Read `TODO.md`, `git status`, `.gitignore`, `setup:check` output, and current diff summary.
- Confirmed `setup:check` still fails only because `.env` is missing and live runs need a real user-provided `OPENAI_API_KEY`.
- Selected an unblocked hygiene issue: README recommends `apps/demo-web/.env.local`, but `.gitignore` only ignored `.env`.
- Updated `.gitignore` to ignore `.env.local` and `.env.*.local`.
- Verified ignore behavior with `git check-ignore -v .env apps/demo-web/.env.local apps/demo-web/.env.development.local apps/demo-web/.env.production.local`.
- Verified `.env.example` remains unignored with `git check-ignore -v .env.example || true`.
- Verified lint with `npx -y pnpm@10.26.0 lint`.
- Verified full test suite with `npx -y pnpm@10.26.0 test`.
- Verified full typecheck with `npx -y pnpm@10.26.0 typecheck`.
- Verified production build with `npx -y pnpm@10.26.0 build`.

### 2026-06-23 20:36 UTC

- Read `TODO.md` and `git status`.
- Ran `git fetch origin` and confirmed `main...origin/main` was `0 0` before publishing.
- Re-verified the existing local changes with `npx -y pnpm@10.26.0 lint`.
- Re-verified the full test suite with `npx -y pnpm@10.26.0 test`.
- Re-verified typecheck with `npx -y pnpm@10.26.0 typecheck`.
- Committed the setup validation and runner config changes as `ec962ed` (`Add setup validation and runner config checks`).
- Attempted `git push origin main`; GitHub rejected it with 403 because `areka38` does not have write permission to `openai/openai-cua-sample-app`.
- Selected the remaining API-key-free item from the open work: documenting the pinned `npx -y pnpm@10.26.0` fallback for machines where `corepack enable` cannot write pnpm shims.
- Updated `README.md` with the fallback install, setup-check, and dev commands.

## Current Changes

- Modified `README.md`.
- Updated this `TODO.md`.

## Open Items

- `pnpm` is not installed globally in this environment. `corepack enable` failed because it tried to write to `/usr/bin`. Current workaround is `npx -y pnpm@10.26.0 ...`.
- `.env` has not been created yet. `npx -y pnpm@10.26.0 setup:check` currently reports this as an error. Live runs need at least `OPENAI_API_KEY`.
- No live CUA smoke test was run because no `OPENAI_API_KEY` is configured.
- Local `main` is ahead of `origin/main`, but push to `https://github.com/openai/openai-cua-sample-app.git` is blocked by missing write permission for `areka38`.

## Suggested Next Work

- Provide a real `OPENAI_API_KEY` in `.env`, then rerun `npx -y pnpm@10.26.0 setup:check`.
- Run one headless scenario and `pnpm test:live` after a real `OPENAI_API_KEY` is configured.
