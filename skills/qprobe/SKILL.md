---
name: qprobe
description: "QUESTPIE Probe — dev testing CLI for AI coding agents. Start servers, test APIs, control browsers via agent-browser, record and replay regression tests with zero tokens. Use when testing web apps, starting dev servers, reading logs, debugging errors, making API calls, checking browser console/network, or composing multi-service stacks."
---

# QUESTPIE Probe

Dev testing CLI for AI coding agents. Start servers, read logs, test APIs, control browsers, record and replay tests.

**Install CLI:** `bun add -g @questpie/probe`
**Install skill:** `bunx skills add questpie/probe`
**Docs:** https://probe.questpie.com/docs

## Core Principles

1. **Logs before browser** — 90% of bugs are visible in logs and HTTP responses. Open a browser only when you need visual verification.
2. **Record → replay free** — record a flow once, replay it forever with pure Playwright. Zero AI tokens on regression.
3. **Token-efficient** — use `snapshot -i` (interactive only), `--diff` (changes only), `--grep` (filtered logs). Read only what you need.

---

## Testing Workflow

Follow this order every time you test an app. Do NOT skip to browser.

### Step 1 — Start the app
```bash
# Option A: from config
qprobe compose up

# Option B: manually
qprobe start server "bun dev" --ready "ready on" --port 3000
```

### Step 2 — Check health (no browser yet)
```bash
qprobe ps                                    # is it running?
qprobe health http://localhost:3000/api/health   # does it respond?
qprobe check http://localhost:3000           # all-in-one summary
```

### Step 3 — Read logs (no browser yet)
```bash
qprobe logs server                           # recent logs
qprobe logs server --grep "ERROR"            # find errors
qprobe logs server --level error             # only ERROR level
qprobe logs --all --grep "ERROR"             # errors from all services
```

### Step 4 — Test API (no browser yet)
```bash
qprobe http GET /api/health --status 200
qprobe http GET /api/users --status 200
qprobe http POST /api/users -d '{"name":"Test"}' --status 201
```

### Step 5 — Open browser (only if needed)
```bash
qprobe browser open http://localhost:3000
qprobe browser snapshot -i -c               # see interactive elements
qprobe browser errors                        # JS errors?
qprobe browser network --failed              # failed requests?
qprobe browser console --level error         # console errors?
```

### Step 6 — Interact and verify
```bash
qprobe browser click @e3                     # click element from snapshot
qprobe browser fill @e2 "hello"              # fill input
qprobe browser press Enter                   # submit
qprobe browser snapshot --diff               # what changed?
qprobe browser screenshot                    # visual proof
```

### Step 7 — Assert
```bash
qprobe assert status 200 /api/health        # API is healthy
qprobe assert no-errors                      # no JS errors in browser
qprobe assert no-network-errors              # no 4xx/5xx in network
qprobe assert text "Dashboard"              # page shows expected text
qprobe assert title "My App"                # page title matches
```

### Step 8 — Record for regression
```bash
qprobe record start "my-flow"
# ... repeat steps 5-7 ...
qprobe record stop                           # saves JSON + generates .spec.ts
qprobe replay "my-flow"                      # run Playwright test (zero tokens)
qprobe replay --all                          # run all recorded tests
```

### Step 9 — Cleanup
```bash
qprobe stop --all                            # or: qprobe compose down
```

---

## Debugging Workflow

When something doesn't work — don't jump to browser. Triage in this order:

### 1. Is it running?
```bash
qprobe ps
qprobe check
```

### 2. Check logs for errors
```bash
qprobe logs server --level error
qprobe logs --all --grep "Error|fail|crash" --since 10m
```

### 3. Test API directly
```bash
qprobe http GET /api/health --status 200
qprobe http GET /api/<endpoint> -v              # verbose: see full request/response
```

### 4. Browser only if UI bug
```bash
qprobe browser open <url>
qprobe browser console --level error            # JS errors?
qprobe browser network --failed                 # failed requests?
qprobe browser snapshot -i                      # what does the page show?
```

### 5. Fix → restart → verify → record
```bash
qprobe restart server
qprobe logs server --level error --since 1m     # should be empty now
qprobe record start "fix-<issue>"
# (re-run the verification steps that failed before)
qprobe assert no-errors
qprobe record stop
qprobe replay "fix-<issue>"                     # MUST pass
```

### Exit Codes

| Code | Meaning | What to do |
|------|---------|------------|
| 0 | Success | Continue |
| 1 | Assertion/command error | Read the output message |
| 2 | Process timeout | Ready pattern not matched — check logs, increase `--timeout` |
| 3 | Health check failed | Server not responding — check if process is running |
| 4 | Config error | Check `qprobe.config.ts` syntax |
| 5 | Browser driver missing | Install: `bun add -g agent-browser` |
| 6 | Replay test failure | Regression — check what changed in code |

---

## Shipping a Feature

A feature is **NOT done** until its replay passes.

### 1. Plan what to test

Before writing any test, identify:
- What are the **critical user flows** for this feature?
- What are the **edge cases**? (empty state, validation errors, permissions)
- What **API endpoints** does it touch?

If unclear — **ask the user** for their expected flows and scenarios.

### 2. Verify with logs + API first
```bash
qprobe logs server --level error                # no errors after change
qprobe http GET /api/<endpoint> --status 200    # API works
```

### 3. Record each user flow
```bash
# For each critical flow:
qprobe record start "<feature>-<flow-name>"
qprobe browser open <start-url>
# (interact: fill, click, navigate)
qprobe assert no-errors
qprobe assert no-network-errors
qprobe record stop
```

### 4. Replay ALL — must pass
```bash
qprobe replay --all
# If any replay fails → fix and re-record that flow
```

### 5. Feature is shippable when:
- All **existing replays** still pass (no regressions)
- All **new feature flows** are recorded and pass
- **No JS errors**, no network errors

---

## Command Reference

| Command | Purpose | When to use |
|---------|---------|-------------|
| `qprobe start` | Start process with ready detection | Dev server, DB, worker |
| `qprobe stop` | Graceful stop (SIGTERM → SIGKILL) | Cleanup |
| `qprobe restart` | Stop + start with saved config | After code changes |
| `qprobe ps` | List running processes | Check what's up |
| `qprobe health` | Poll URL until healthy | Wait for server |
| `qprobe compose` | Multi-service orchestration | Start full stack |
| `qprobe logs` | Read/filter/follow logs | Debug errors |
| `qprobe http` | HTTP requests with assertions | Test API |
| `qprobe check` | All-in-one health summary | Quick overview |
| `qprobe browser` | Browser automation (27 subcommands) | Visual testing |
| `qprobe record` | Record browser actions | Capture test flow |
| `qprobe replay` | Run recorded Playwright tests | Regression testing |
| `qprobe assert` | Assert conditions (exit 1 on fail) | Verify state |
| `qprobe init` | Scaffold qprobe.config.ts | Project setup |

## Detailed References

Read the reference file for the command group you need:

- **Process management** (start, stop, ps, health, restart) → `references/process.md`
- **Logs** (read, filter, grep, follow, merge) → `references/logs.md`
- **HTTP requests & API testing** → `references/http.md`
- **Quick health check** (one-shot status + services) → `references/check.md`
- **Browser control** (snapshot, click, fill, console, network) → `references/browser.md`
- **agent-browser driver** (refs, sessions, auth, network HAR, diffs, advanced features) → `references/agent-browser.md`
- **Service orchestration** (compose up/down, dependencies) → `references/compose.md`
- **Recording & replay** (test capture, Playwright codegen) → `references/recording.md`
- **Assertions** (text, element, URL, status, errors) → `references/assertions.md`
- **UX testing methods** (heuristics, task completion, a11y) → `references/ux.md`

## Tips

- `qprobe logs server --grep "ERROR"` is faster than reading all logs
- `qprobe http` is cheaper than `qprobe browser` for API testing
- `snapshot -i` saves tokens — shows only interactive elements
- `snapshot --diff` after actions shows only what changed
- `qprobe check` gives a one-command status overview
- Record flows early — replay is free forever
