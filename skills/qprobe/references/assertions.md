# Assertions Reference

Assert conditions against browser state or HTTP endpoints. Exit code 0 on pass, exit code 1 on fail.

## Assertion Types

### text / no-text

```bash
qprobe assert text "Dashboard"              # page body contains text
qprobe assert no-text "Error"               # page body does NOT contain text
```

- **Case-sensitive** — `"Dashboard"` will NOT match `"dashboard"`
- Uses `includes()` on full page text content
- Requires open browser session

Output:
```
✅ Page contains "Dashboard"
❌ Page does not contain "Dashboard"    # exit 1
```

### element

```bash
qprobe assert element @e3                    # ref from snapshot exists
qprobe assert element "#user-avatar"         # CSS selector exists
```

- Checks the interactive snapshot (`-i -c`) for the ref or selector string
- Accepts `@e` refs (from most recent snapshot) and CSS selectors

Output:
```
✅ Element "@e3" exists
❌ Element "@e3" not found               # exit 1
```

### url

```bash
qprobe assert url "/dashboard"               # URL contains /dashboard
qprobe assert url "^https://"                # URL starts with https
qprobe assert url "/users/\\d+"              # regex match
```

- Pattern is a **JavaScript RegExp** (not glob, not exact match)
- Matches against full current URL

Output:
```
✅ URL matches "/dashboard" (http://localhost:3000/dashboard)
❌ URL "http://localhost:3000/login" does not match "/dashboard"    # exit 1
```

### title

```bash
qprobe assert title "Dashboard"
```

- **Case-sensitive** `includes()` on page title

Output:
```
✅ Title contains "Dashboard" (Dashboard - My App)
❌ Title "Login - My App" does not contain "Dashboard"    # exit 1
```

### status

```bash
qprobe assert status 200 /api/health        # TWO arguments: code + path
qprobe assert status 404 /api/nonexistent
qprobe assert status 201 /api/users
```

- **Two positional arguments**: expected status code, then URL path
- Path resolves against baseUrl (same resolution as `qprobe http`)
- Makes an HTTP request and checks the response status

Output:
```
✅ http://localhost:3000/api/health returned 200
❌ http://localhost:3000/api/health returned 500, expected 200    # exit 1
```

### no-errors

```bash
qprobe assert no-errors
```

- Checks browser console for uncaught JS exceptions
- Requires open browser session

Output:
```
✅ No JS errors

❌ Found 2 JS error(s):                                          # exit 1
  TypeError: Cannot read properties of undefined (reading 'map')
  ReferenceError: user is not defined
```

### no-network-errors

```bash
qprobe assert no-network-errors
```

- Checks network tab for 4xx/5xx HTTP responses
- Requires open browser session

Output:
```
✅ No network errors

❌ Found 1 network error(s):                                     # exit 1
  POST 500 /api/users
```

## Common Patterns

### After form submission
```bash
qprobe browser click @e5                     # submit
qprobe browser wait --network idle
qprobe assert no-errors
qprobe assert no-network-errors
qprobe assert text "Saved successfully"
```

### After page navigation
```bash
qprobe browser click @e3
qprobe assert url "/dashboard"
qprobe assert title "Dashboard"
qprobe assert no-errors
```

### Full health check (API + browser)
```bash
qprobe assert status 200 /api/health
qprobe assert status 200 /api/users
qprobe assert no-errors
qprobe assert no-network-errors
```

### CI/script chaining
```bash
# All assertions exit 1 on failure — chain with &&
qprobe assert status 200 /api/health && \
qprobe assert no-errors && \
qprobe assert text "Welcome" && \
echo "All checks passed"
```

## Tips

- `text` / `no-text` are **case-sensitive** — use exact case from the page
- `url` uses **regex** — escape dots in literal URLs: `"localhost\\.com"`
- `element` checks the interactive snapshot string, not raw DOM
- `status` needs **TWO args** — the expected code AND the URL path
- `no-errors` and `no-network-errors` **require an open browser session**
- Chain assertions with `&&` for scripts and CI
- All assertions exit code 1 on failure — useful for conditional logic
