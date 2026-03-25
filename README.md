# QUESTPIE Probe

Dev testing CLI for AI coding agents. Orchestrates dev servers, aggregates logs, controls browsers, sends HTTP requests, records and replays tests.

**[Documentation](https://probe.questpie.com/docs)** | **[GitHub](https://github.com/questpie/probe)**

## Install

```bash
# Install the CLI
bun add -g @questpie/probe

# Install the AI skill (for Claude Code, Cursor, Windsurf)
npx skills add questpie/probe
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
| `qprobe ps` | List running processes |
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

## License

MIT
