---
name: qprobe-compose
description: "QUESTPIE Probe compose — multi-service orchestration with dependency graphs. Start DB, server, admin, workers in correct order with health checks. Config via qprobe.config.ts. Use when: starting a full dev stack, managing multiple services, need database + server + frontend running together. Triggers: 'start everything', 'compose up', 'start the stack', 'bring up the dev environment', 'start db and server'. Use when project has multiple services that need to start in order."
---

# qprobe — Compose

Multi-service orchestration with dependency resolution and health checks.

**Install:** `npm install -g @questpie/probe`

## Usage

```bash
qprobe compose up          # start all services in dependency order
qprobe compose down        # stop all in reverse order
qprobe compose restart     # restart all
qprobe compose status      # show service states
```

## Config (`qprobe.config.ts`)

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
    admin: {
      cmd: 'bun run admin:dev',
      ready: 'ready on http://localhost:3001',
      port: 3001,
      depends: ['server'],
    },
  },
})
```

## What Happens

```bash
qprobe compose up
# ⏳ Starting db... ready (2.3s)
# ⏳ Starting server... ready (4.1s)    ← waited for db first
# ⏳ Starting admin... ready (3.5s)     ← waited for server first
# ✅ All 3 services ready (9.9s)
```

Dependency graph resolved automatically. Parallel start where possible.

## Flags

| Flag | Description |
|------|-------------|
| `--only <names>` | Start only these (+ dependencies) |
| `--skip <names>` | Skip these services |
| `--no-health` | Don't wait for health checks |

```bash
qprobe compose up --only server     # starts db (dep) + server
qprobe compose up --skip admin      # starts db + server, skips admin
```

## Inline (No Config File)

```bash
qprobe compose up \
  --service "db: docker compose up postgres | ready to accept" \
  --service "server: bun dev | ready on" \
  --depends "server:db"
```
