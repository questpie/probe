---
name: qprobe
description: "QUESTPIE Probe — dev testing CLI for AI coding agents. Orchestrates dev servers, aggregates logs, controls browsers, sends HTTP requests, records and replays tests. Use when: testing web apps, starting dev servers, checking logs, debugging runtime errors, recording test flows, making API calls against running servers, checking browser console or network tab, composing multi-service stacks. Triggers: 'test this app', 'start the server', 'check if it works', 'what are the logs', 'any errors?', 'record a test', 'run the tests', 'call the API', 'check the network tab', 'start the database', 'compose up', 'is the server running', 'replay tests', 'check for regressions'. Even if the user doesn't mention qprobe by name, use this skill when they want to test, debug, or verify a running web application."
---

# QUESTPIE Probe

Dev testing CLI. Manages dev servers, reads logs, controls browsers, sends HTTP requests, records and replays tests.

**Install CLI:** `bun add -g @questpie/probe`
**Install skill:** `bunx skills add questpie/probe`

## Core Principle

> Read logs before opening a browser. 90% of debugging needs zero visual context.

## Quick Start

```bash
qprobe compose up                           # start all services from config
qprobe check http://localhost:3000           # health + console + network summary
qprobe logs server --grep "ERROR"            # check process logs
qprobe http GET /api/health                  # test API endpoint
qprobe browser open http://localhost:3000    # open browser (only if needed)
qprobe browser snapshot -i                   # see interactive elements
```

## Command Groups

| Command | What it does | When to use |
|---------|-------------|-------------|
| `qprobe start` | Start a process with ready detection | Need to run dev server, DB, worker |
| `qprobe stop` | Stop a running process | Cleanup, restart |
| `qprobe ps` | List running processes | Check what's running |
| `qprobe health` | Poll URL until healthy | Wait for server to be ready |
| `qprobe compose` | Multi-service orchestration | Start full stack (DB+server+admin) |
| `qprobe logs` | Read/filter/follow process logs | Debug server errors |
| `qprobe http` | Send HTTP requests | Test API endpoints |
| `qprobe check` | All-in-one health summary | Quick status overview |
| `qprobe browser` | Browser automation | Visual testing, form filling |
| `qprobe record` | Record a test session | Capture a flow for regression |
| `qprobe replay` | Replay recorded tests | Run regression (zero AI tokens) |
| `qprobe assert` | Assert conditions | Verify state in CI or scripts |

## Recommended Workflow

1. **Start stack** → `qprobe compose up`
2. **Read logs** → `qprobe logs --all --grep ERROR` (no browser yet!)
3. **Test API** → `qprobe http GET /api/health` (still no browser!)
4. **Quick check** → `qprobe check` (summarizes everything)
5. **Open browser** → `qprobe browser open /login` (only if needed)
6. **Record test** → `qprobe record start "login-flow"`
7. **Replay free** → `qprobe replay --all` (pure Playwright, zero tokens)

## Sub-Skills

For detailed reference on each command group, read the corresponding reference file:

- **Process management** (start, stop, ps, health, restart) → read `references/process.md`
- **Compose** (multi-service orchestration, config file) → read `references/compose.md`
- **HTTP requests** (API testing, auth, assertions) → read `references/http.md`
- **Browser control** (snapshot, click, fill, console, network) → read `references/browser.md`
- **Recording & replay** (test capture, Playwright codegen) → read `references/recording.md`

## Config File

Create `qprobe.config.ts` in project root (optional — CLI works without it):

```typescript
import { defineConfig } from '@questpie/probe'

export default defineConfig({
  services: {
    db: {
      cmd: 'docker compose up postgres',
      ready: 'ready to accept connections',
    },
    server: {
      cmd: 'bun dev',
      ready: 'ready on http://localhost:3000',
      port: 3000,
      health: '/api/health',
      depends: ['db'],
    },
  },
  browser: {
    driver: 'agent-browser',
    baseUrl: 'http://localhost:3000',
  },
  http: {
    baseUrl: 'http://localhost:3000',
  },
})
```

## Tips for Agents

- **Always check logs before opening browser** — most bugs are visible in `qprobe logs`
- **Use `qprobe check`** for a one-command overview of server health
- **Use `qprobe http`** instead of browser for API testing — much cheaper on tokens
- **Snapshot with `-i`** (interactive only) to save tokens — skip structural/decorative elements
- **Snapshot with `--diff`** after actions to see only what changed
- **Record flows you want to verify later** — replay costs zero AI tokens
- **Grep is your friend** — `qprobe logs server --grep "ERROR"` is faster than reading everything
