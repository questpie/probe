# QUESTPIE Probe

Dev testing CLI for AI coding agents. Orchestrates dev servers, aggregates logs, controls browsers, sends HTTP requests, records and replays tests.

**[Documentation](https://probe.questpie.com/docs)** | **[GitHub](https://github.com/questpie/probe)**

## Install

```bash
# Install the CLI
bun add -g @questpie/probe

# Install the AI skill (for Claude Code, Cursor, Windsurf)
bunx skills add questpie/probe
```

## Quick Start

```bash
# Initialize config
qprobe init

# Start a server with ready detection
qprobe start server "bun dev" --ready "ready on" --port 3000

# Check health
qprobe health http://localhost:3000/api/health

# Make HTTP requests
qprobe http GET /api/users --status 200
qprobe http POST /api/users -d '{"name":"test"}' --jq ".id"

# Read logs
qprobe logs server --grep "ERROR"
qprobe logs --all --level error

# Browser control
qprobe browser open http://localhost:3000
qprobe browser snapshot -i
qprobe browser click @e1
qprobe browser fill @e2 "hello"

# Record & replay
qprobe record start "login-flow"
qprobe record stop
qprobe replay "login-flow"

# Compose (from qprobe.config.ts)
qprobe compose up
qprobe compose status
qprobe compose down

# Assertions
qprobe assert status 200 /api/health
qprobe assert no-errors
```

## Commands

| Command | Description |
|---------|-------------|
| `qprobe start` | Start a background process with ready detection |
| `qprobe stop` | Stop a process (SIGTERM → SIGKILL) |
| `qprobe restart` | Restart with saved config |
| `qprobe ps` | List running processes (`--all` for every session + shared) |
| `qprobe health` | Poll URL until it responds |
| `qprobe logs` | Read logs with grep, level, follow |
| `qprobe http` | HTTP requests with assertions |
| `qprobe check` | Quick health + status overview |
| `qprobe compose` | Manage service stack from config |
| `qprobe browser` | 27 browser control subcommands |
| `qprobe record` | Record browser actions |
| `qprobe replay` | Replay as Playwright tests |
| `qprobe recordings` | Manage recordings |
| `qprobe assert` | Run assertions |
| `qprobe init` | Scaffold config |

## Config

```typescript
// qprobe.config.ts
import { defineConfig } from '@questpie/probe'

export default defineConfig({
  services: {
    db: {
      cmd: 'docker compose up postgres',
      ready: 'ready to accept connections',
      health: 'http://localhost:5432',
      shared: true,                       // reuse one DB across agents/worktrees
      setup: ['bun db:migrate'],          // run once after healthy (per scope)
    },
    server: {
      cmd: 'bun dev',
      ready: 'ready on http://localhost:3000',
      port: 3000,
      health: '/api/health',
      depends: ['db'],
      env: { DATABASE_URL: 'postgres://localhost:5432/app_${SESSION}' },
    },
  },
  session: {
    portless: true,                       // default; set false to opt out
  },
  browser: { driver: 'agent-browser', baseUrl: 'http://localhost:3000' },
  http: { baseUrl: 'http://localhost:3000' },
})
```

## Multi-agent & sessions

Probe isolates state per **session** so multiple agents/worktrees can run
concurrently without colliding. Each session gets its own
`tmp/qprobe/sessions/<id>/` for PIDs, logs, snapshots, and recordings.

- **Auto session id** — derived from the git worktree (`<basename>-<hash>`), so two
  worktrees of the same repo isolate automatically. Override with `QPROBE_SESSION`.
- **`shared: true`** — a service (e.g. Postgres) lives in a shared scope, is reused
  if already running, and only stops when the last session releases it (refcounted).
- **`setup: [...]`** — commands run once after a service is healthy (migrations,
  seeds), idempotent per scope. `${SESSION}` / `${PORT}` interpolation works in
  `cmd`, `env`, and `setup`.
- **`qprobe ps --all`** — see processes across every session plus the shared scope.
- **portless** — on by default for stable per-worktree `*.localhost` URLs; falls back
  to localhost/port if the binary is absent. Opt out via `session.portless: false`.

### Environment variables

| Var | Effect |
|-----|--------|
| `QPROBE_SESSION` | Explicit session id (overrides the auto worktree id) |
| `QPROBE_ROOT_DIR` | Base dir for runtime state (default `tmp/qprobe`) |
| `QPROBE_PORTLESS` | `1` to force portless on, `0` to opt out |

## License

MIT
