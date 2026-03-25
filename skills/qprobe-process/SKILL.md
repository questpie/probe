---
name: qprobe-process
description: "QUESTPIE Probe process management. Start dev servers with ready-pattern detection, stop, restart, health checks, list running processes. Use when: starting a dev server, checking if server is running, waiting for service to be ready, restarting after code change. Triggers: 'start the server', 'bun dev', 'is it running', 'restart', 'health check', 'wait for ready', 'server crashed'. Use even when user just says 'run it' or 'start it up' in context of a dev project."
---

# qprobe — Process Management

Start dev servers with ready-pattern detection, health checks, and lifecycle management.

**Install:** `npm install -g @questpie/probe`

## Commands

```bash
# Start with ready detection
qprobe start <n> "<cmd>" --ready "<pattern>" [--port <n>] [--timeout 60s]

# Examples
qprobe start server "bun dev" --ready "ready on" --port 3000
qprobe start db "docker compose up postgres" --ready "ready to accept"

# Lifecycle
qprobe stop <n|--all>
qprobe restart <n>
qprobe ps                    # list running processes
qprobe ps --json             # machine-readable

# Health check — poll URL until 200
qprobe health http://localhost:3000/api/health --timeout 30s

# Read logs
qprobe logs <n>              # last 50 lines
qprobe logs <n> --follow     # tail -f
qprobe logs <n> --grep "ERROR"
qprobe logs --all            # all processes merged
```

## How It Works

- Spawns child process as daemon (survives between CLI calls)
- Pipes stdout/stderr to `tmp/qprobe/logs/<n>.log` (timestamped)
- Monitors output for `--ready` pattern, returns when matched
- PID saved to `tmp/qprobe/pids/<n>.pid`
- `qprobe stop` sends SIGTERM → SIGKILL after 5s

## Common Patterns

```bash
# Start, wait, test
qprobe start server "bun dev" --ready "ready on" --port 3000
qprobe health http://localhost:3000/api/health
qprobe http GET /api/users

# Check what crashed
qprobe ps
qprobe logs server --lines 100 --grep "ERROR"
qprobe restart server
```
