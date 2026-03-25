# Process Management Reference

## Start a Process

```bash
qprobe start <name> "<command>" [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--ready "<pattern>"` | — | String/regex in stdout that signals ready |
| `--timeout <dur>` | `60s` | Max wait for ready pattern |
| `--port <n>` | — | Port for health checks and baseUrl |
| `--env KEY=VAL` | — | Environment variables (repeatable) |
| `--cwd <path>` | `.` | Working directory |

### Examples

```bash
# Database
qprobe start db "docker compose up postgres" --ready "ready to accept" --timeout 30s

# Dev server
qprobe start server "bun dev" --ready "ready on" --port 3000

# Worker with env
qprobe start worker "bun run jobs" --ready "worker started" --env QUEUE=default

# No ready pattern — just start and return immediately
qprobe start redis "redis-server"
```

### What Happens

1. Spawns child process (detached, survives between CLI calls)
2. Pipes stdout/stderr → `tmp/qprobe/logs/<name>.log` (timestamped)
3. Monitors stdout for `--ready` pattern
4. Returns when ready OR exits with code 2 on timeout
5. Saves PID to `tmp/qprobe/pids/<name>.pid`
6. Saves config to `tmp/qprobe/state/<name>.json` (for restart)

## Stop

```bash
qprobe stop <name>      # stop one service
qprobe stop --all        # stop everything
```

Sends SIGTERM → waits 5s → SIGKILL if still alive.

## Restart

```bash
qprobe restart <name>    # stop + start with original config
```

## Process Status

```bash
qprobe ps                # table view
qprobe ps --json         # machine-readable
```

Output:
```
NAME     PID    PORT   STATUS   UPTIME    MEM
db       12345  5432   ready    5m 23s    128MB
server   12346  3000   ready    5m 20s    256MB
```

## Health Check

```bash
qprobe health <url> [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--interval <dur>` | `1s` | Polling interval |
| `--timeout <dur>` | `30s` | Max total wait |
| `--status <code>` | `200` | Expected HTTP status |

```bash
qprobe health http://localhost:3000/api/health
# ✅ Responding (200 OK, 45ms) after 3.2s

qprobe health http://localhost:5432 --timeout 60s
# ✅ Responding after 8.1s
```

## Common Patterns

### Start server, wait, then test
```bash
qprobe start server "bun dev" --ready "ready on" --port 3000
qprobe health http://localhost:3000/api/health
qprobe http GET /api/users
```

### Restart after code change
```bash
qprobe restart server
qprobe health http://localhost:3000/api/health
qprobe check
```

### Check if something crashed
```bash
qprobe ps
# If server shows "stopped" or is missing:
qprobe logs server --lines 50
# Look for the crash reason, then:
qprobe restart server
```
