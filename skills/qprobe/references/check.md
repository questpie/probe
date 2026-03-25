# Check Reference

Quick one-shot health check. Single HTTP request + timing + running services summary.

## Usage

```bash
qprobe check [url]
```

No flags. URL defaults to baseUrl from config (same resolution as `qprobe http`).

## What It Does

1. Makes a single HTTP request to the URL
2. Reports HTTP status code + response time in milliseconds
3. Lists all running managed processes

## Output

```bash
qprobe check http://localhost:3000
# ✅ HTTP 200 OK (45ms)
# ℹ 3 service(s) running (db, server, worker)
```

```bash
qprobe check http://localhost:3000
# ❌ HTTP 500 Internal Server Error (120ms)
# ℹ 2 service(s) running (db, server)
```

```bash
qprobe check http://localhost:3000
# ❌ Connection failed: ECONNREFUSED
# ⚠ No managed services running
```

```bash
# Without URL — uses config baseUrl
qprobe check
# ✅ HTTP 200 OK (32ms)
# ℹ 1 service(s) running (server)
```

## check vs health

| | `qprobe check` | `qprobe health` |
|--|----------------|-----------------|
| Requests | Single | Polling until success |
| Timeout | None | `--timeout` (default 30s) |
| Retries | No | Yes (`--interval`) |
| Service list | Yes | No |
| Use case | "Is it up right now?" | "Wait until it's up" |

## When to Use

- **First command in debugging** — quick sanity check before digging deeper
- **After `qprobe compose up`** — verify the stack came up
- **After `qprobe restart`** — verify server is responding
- Simpler than `qprobe health` when you don't need polling/retries
