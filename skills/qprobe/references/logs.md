# Logs Reference

Timestamped, level-parsed logs for every managed process.

## Usage

```bash
qprobe logs <name> [flags]          # single process
qprobe logs --all [flags]           # all processes, merged by timestamp
qprobe logs --unified [flags]       # all processes + browser log
```

## Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--follow` | `-f` | `false` | Stream new entries in real time (tail -f). Blocks until Ctrl+C |
| `--lines` | `-n` | `50` | Number of recent lines to show |
| `--grep` | | — | Case-insensitive regex filter on message text |
| `--level` | | — | Exact level filter: `error`, `warn`, `info`, `debug` |
| `--since` | | — | Time range: `30s`, `5m`, `1h` — only entries newer than this |
| `--all` | | `false` | Merge logs from all processes, sorted by timestamp |
| `--unified` | | `false` | All processes + browser console, interleaved |
| `--json` | | `false` | Output as JSON array of LogEntry objects |

## Output Format

Single process:
```
2026-03-25T20:30:15.247Z INFO  Server ready on http://localhost:3000
2026-03-25T20:30:16.103Z ERROR Connection refused to database
```

With `--all` or `--unified` (includes source name):
```
[server] 2026-03-25T20:30:15.247Z INFO  Server ready on http://localhost:3000
[db]     2026-03-25T20:30:14.892Z INFO  PostgreSQL ready to accept connections
[server] 2026-03-25T20:30:16.103Z ERROR Connection refused to database
```

Colors in follow mode: ERROR = red, WARN = yellow, others = default.

JSON output (`--json`):
```json
[
  {
    "timestamp": "2026-03-25T20:30:16.103Z",
    "level": "ERROR",
    "message": "Connection refused to database",
    "source": "server"
  }
]
```

## Examples

```bash
# Last 50 lines from server (default)
qprobe logs server

# Only errors
qprobe logs server --level error

# Regex search across message text (case-insensitive)
qprobe logs server --grep "connection|timeout|refused"

# Errors from the last 5 minutes
qprobe logs server --level error --since 5m

# Stream new errors in real time
qprobe logs server -f --level error
# (blocks — Ctrl+C to stop)

# Check all services for a pattern
qprobe logs --all --grep "ECONNREFUSED"

# Last 200 lines as JSON (pipe to jq)
qprobe logs server --json --lines 200
```

## Common Patterns

### Find why the server crashed
```bash
qprobe ps                                       # is it still running?
qprobe logs server --level error                 # recent errors
qprobe logs server --grep "stack|trace|fatal"    # stack traces
```

### Watch for errors during testing
```bash
# In one terminal / before testing:
qprobe logs server -f --level error
# Run browser commands in another terminal — errors appear in real time
```

### Check all services after compose up
```bash
qprobe compose up
qprobe logs --all --level error --since 1m       # any errors during startup?
```

### Machine-readable logs for analysis
```bash
qprobe logs server --json --since 1h | jq '.[] | select(.level == "ERROR")'
```

## Tips

- **Always check logs BEFORE opening a browser** — most bugs are visible here
- `--grep` is a regex — use `"fail|error|crash"` for broad search
- `--level error` is faster than `--grep "error"` (exact field match vs string search)
- `--since 5m` narrows results to recent issues — useful after code changes
- Follow mode (`-f`) blocks the terminal — use it for real-time monitoring during testing
- Log files are stored in `tmp/qprobe/logs/<name>.log`
- Level detection is automatic: lines containing "error" → ERROR, "warn" → WARN, etc.
