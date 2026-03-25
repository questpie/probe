---
name: qprobe-http
description: "QUESTPIE Probe HTTP requests. Send API requests against running dev servers with auto baseUrl, Bearer auth, status assertions, JQ filtering, verbose mode. Cheaper than browser for API testing. Use when: testing API endpoints, checking server responses, CRUD operations, verifying auth, debugging 500 errors. Triggers: 'call the API', 'test the endpoint', 'POST to /api/users', 'check if the API works', 'what does the server return', 'send a request'. Prefer this over browser for any API-only testing."
---

# qprobe — HTTP Requests

API testing with auto-resolved baseUrl. Cheaper than browser for backend testing.

**Install:** `npm install -g @questpie/probe`

## Usage

```bash
qprobe http <METHOD> <path> [flags]
```

Path is relative — baseUrl auto-resolved from config or running services.

## Examples

```bash
# Basic
qprobe http GET /api/users
qprobe http GET /api/users/1

# POST with body
qprobe http POST /api/users -d '{"name":"New","email":"new@test.com"}'

# Auth
qprobe http GET /api/admin/stats --token "eyJhbGci..."
qprobe http GET /api/data -H "X-API-Key: abc123"

# Assert status (exit 1 if different)
qprobe http GET /api/health --status 200
qprobe http DELETE /api/users/1 --status 204

# Filter response
qprobe http GET /api/users --jq ".[0].name"
qprobe http GET /api/stats --jq ".revenue.total"

# Verbose (show headers)
qprobe http POST /api/login -d '{"email":"a@b.com","pass":"123"}' -v

# Raw output (for piping)
qprobe http GET /api/users --raw | jq '.[].email'
```

## Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--data <json>` | `-d` | JSON request body |
| `--header <k:v>` | `-H` | Header (repeatable) |
| `--token <jwt>` | | Bearer auth shortcut |
| `--status <code>` | | Assert expected status |
| `--jq <expr>` | | JQ filter on response |
| `--raw` | | No formatting (for pipes) |
| `--verbose` | `-v` | Full request/response headers |
| `--base <url>` | | Override baseUrl |

## Tips

- **Use `qprobe http` instead of browser** for API testing — much cheaper on tokens
- **`--status` for assertions** — `qprobe http GET /api/health --status 200`
- **`--jq` for extraction** — `qprobe http GET /api/me --jq ".user.role"`
- **Chain with login** — extract token, use in subsequent requests
