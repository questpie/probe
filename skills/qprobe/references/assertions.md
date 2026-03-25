# Assertions Reference

Assert conditions against browser state or HTTP endpoints. Exit code 1 on failure.

## HTTP Assertions

```bash
qprobe assert status 200 /api/health        # endpoint returns 200
qprobe assert status 201 /api/users          # endpoint returns 201
qprobe assert status 404 /api/nonexistent    # endpoint returns 404
```

## Browser Assertions

Require an open browser session (`qprobe browser open` first).

```bash
qprobe assert text "Dashboard"              # page body contains text
qprobe assert no-text "Error"               # page body does NOT contain text
qprobe assert element @e3                    # element from snapshot exists
qprobe assert url "/dashboard"               # current URL matches pattern
qprobe assert title "My App"                # page title contains text
qprobe assert no-errors                      # no uncaught JS exceptions
qprobe assert no-network-errors              # no 4xx/5xx HTTP requests
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

### Full health check
```bash
qprobe assert status 200 /api/health
qprobe assert status 200 /api/users
qprobe assert no-errors
qprobe assert no-network-errors
```

### CI/script usage
```bash
# All assertions exit 1 on failure — use in CI:
qprobe assert status 200 /api/health && \
qprobe assert no-errors && \
qprobe assert text "Welcome" && \
echo "All checks passed"
```
