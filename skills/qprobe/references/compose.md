# Compose Reference

## Commands

```bash
qprobe compose up [flags]     # start all services in dependency order
qprobe compose down           # stop all in reverse order
qprobe compose restart [name] # restart one or all
qprobe compose status         # show all service states
```

| Flag | Description |
|------|-------------|
| `--only <name,...>` | Start only these services (+ their dependencies) |
| `--skip <name,...>` | Skip these services |
| `--no-health` | Don't wait for health checks |
| `--config <path>` | Custom config file path |

## Config File

`qprobe.config.ts` in project root:

```typescript
import { defineConfig } from '@questpie/probe'

export default defineConfig({
  services: {
    db: {
      cmd: 'docker compose up postgres',
      ready: 'ready to accept connections',
      health: 'http://localhost:5432',
      stop: 'docker compose down postgres',  // custom stop command
    },
    server: {
      cmd: 'bun dev',
      ready: 'ready on http://localhost:3000',
      port: 3000,
      health: '/api/health',    // relative to http://localhost:<port>
      depends: ['db'],
      env: {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dev',
      },
    },
    admin: {
      cmd: 'bun run admin:dev',
      ready: 'ready on http://localhost:3001',
      port: 3001,
      depends: ['server'],
    },
    worker: {
      cmd: 'bun run jobs',
      ready: 'worker started',
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

## Dependency Resolution

`qprobe compose up` resolves the dependency graph and starts in order:

```
Given: server depends on db, admin depends on server, worker depends on db

Start order:
1. db (no dependencies)
2. server + worker (both depend on db, start in parallel)
3. admin (depends on server)

Stop order (reverse):
1. admin
2. server + worker
3. db
```

## Examples

```bash
# Start everything
qprobe compose up
# ⏳ Starting db... ready (2.3s)
# ⏳ Starting server... ready (4.1s)
# ⏳ Starting worker... ready (1.2s)
# ⏳ Starting admin... ready (3.5s)
# ✅ All 4 services ready (11.1s)

# Start only server (auto-starts db dependency)
qprobe compose up --only server
# ⏳ Starting db... ready (2.3s)
# ⏳ Starting server... ready (4.1s)
# ✅ 2 services ready (6.4s)

# Skip admin
qprobe compose up --skip admin

# Stop everything
qprobe compose down
# ⏳ Stopping admin... stopped
# ⏳ Stopping server... stopped
# ⏳ Stopping worker... stopped
# ⏳ Stopping db... stopped
# ✅ All services stopped

# Restart just the server
qprobe compose restart server

# Check status
qprobe compose status
```

## Inline Compose (No Config File)

```bash
qprobe compose up \
  --service "db: docker compose up postgres | ready to accept" \
  --service "server: bun dev | ready on http://localhost:3000" \
  --depends "server:db"
```

Format: `--service "name: command | ready-pattern"`
