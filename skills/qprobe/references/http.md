# HTTP Requests Reference

## Basic Usage

```bash
qprobe http <METHOD> <path> [flags]
```

Path is relative to baseUrl (from config, `--base`, or auto-detected from running services).

| Flag | Short | Description |
|------|-------|-------------|
| `--base <url>` | | Override base URL |
| `--data <json>` | `-d` | Request body (JSON string) |
| `--header <k:v>` | `-H` | Header (repeatable) |
| `--token <jwt>` | | Bearer token shortcut |
| `--status <code>` | | Assert expected status (exit 1 if different) |
| `--jq <expr>` | | JQ-style filter on response body |
| `--raw` | | Raw output (no pretty-print, no status line) |
| `--timing` | | Show request timing breakdown |
| `--verbose` | `-v` | Show full request + response headers |
| `--form` | | Send as form-urlencoded instead of JSON |
| `--file <path>` | | Upload file as multipart |

## BaseUrl Resolution

Order of precedence:
1. `--base` flag
2. `QPROBE_BASE_URL` env variable
3. `http.baseUrl` in `qprobe.config.ts`
4. `browser.baseUrl` in config
5. First running service with a port → `http://localhost:<port>`
6. `http://localhost:3000` (fallback)

## Examples

### GET
```bash
qprobe http GET /api/users
# 200 OK (45ms)
# [
#   { "id": 1, "name": "Admin", "email": "admin@test.com" },
#   { "id": 2, "name": "User", "email": "user@test.com" }
# ]
```

### POST with Body
```bash
qprobe http POST /api/users -d '{"name":"New User","email":"new@test.com"}'
# 201 Created (123ms)
# { "id": 3, "name": "New User", "email": "new@test.com" }
```

### Auth
```bash
# Bearer token
qprobe http GET /api/admin/stats --token "eyJhbGci..."

# Custom header
qprobe http GET /api/data -H "X-API-Key: abc123"

# Cookie
qprobe http GET /api/me -H "Cookie: session=abc123"
```

### Assert Status
```bash
qprobe http GET /api/health --status 200
# ✅ 200 OK (12ms)

qprobe http DELETE /api/users/1 --status 204
# ✅ 204 No Content (89ms)

qprobe http GET /api/nonexistent --status 404
# ✅ 404 Not Found (8ms)

qprobe http GET /api/broken --status 200
# ❌ Expected 200, got 500 Internal Server Error (234ms)
# { "error": "Database connection failed" }
# Exit code: 1
```

### JQ Filter
```bash
qprobe http GET /api/users --jq ".[0].name"
# "Admin"

qprobe http GET /api/users --jq "length"
# 5

qprobe http GET /api/stats --jq ".revenue.total"
# 125000
```

### Verbose
```bash
qprobe http POST /api/login -d '{"email":"a@b.com","password":"123"}' -v
# → POST http://localhost:3000/api/login
# → Content-Type: application/json
# → Body: {"email":"a@b.com","password":"123"}
# ← 200 OK (89ms)
# ← Set-Cookie: session=abc123; HttpOnly; Path=/
# ← Content-Type: application/json
# { "token": "eyJ...", "user": { "id": 1, "name": "Admin" } }
```

### File Upload
```bash
qprobe http POST /api/upload --file ./avatar.png -H "Authorization: Bearer eyJ..."
```

### Raw Output (for piping)
```bash
# Pipe JSON to jq
qprobe http GET /api/users --raw | jq '.[].email'

# Save response to file
qprobe http GET /api/export --raw > export.json
```

## Common Patterns

### Login → Use Token
```bash
# Login and extract token
TOKEN=$(qprobe http POST /api/login -d '{"email":"admin@test.com","password":"pass"}' --raw | jq -r '.token')

# Use token in subsequent requests
qprobe http GET /api/admin/users --token "$TOKEN"
```

### Test CRUD Sequence
```bash
# Create
qprobe http POST /api/users -d '{"name":"Test"}' --status 201
# Read
qprobe http GET /api/users/3 --status 200
# Update
qprobe http PUT /api/users/3 -d '{"name":"Updated"}' --status 200
# Delete
qprobe http DELETE /api/users/3 --status 204
# Verify deleted
qprobe http GET /api/users/3 --status 404
```

### Health Check with Retry
```bash
# Wait for server, then test
qprobe health http://localhost:3000/api/health
qprobe http GET /api/users --status 200
```
