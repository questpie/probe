---
name: qprobe
description: "QUESTPIE Probe — dev testing CLI for AI coding agents. Orchestrates dev servers, aggregates logs, controls browsers, sends HTTP requests, records and replays tests. Use when: testing web apps, starting dev servers, checking logs, debugging runtime errors, recording test flows, making API calls against running servers, checking browser console or network tab, composing multi-service stacks. Triggers: 'test this app', 'start the server', 'check if it works', 'what are the logs', 'any errors?', 'record a test', 'run the tests', 'call the API', 'check the network tab', 'start the database', 'compose up', 'is the server running', 'replay tests', 'check for regressions'. Even if the user doesn't mention qprobe by name, use this skill when they want to test, debug, or verify a running web application."
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

- **Process management** → `references/process.md`
- **HTTP requests & API testing** → `references/http.md`
- **Browser control** → `references/browser.md`
- **Service orchestration** → `references/compose.md`
- **Recording & replay** → `references/recording.md`
- **UX testing methods** → `references/ux.md`
- **Assertions** → `references/assertions.md`

## Tips

- `qprobe logs server --grep "ERROR"` is faster than reading all logs
- `qprobe http` is cheaper than `qprobe browser` for API testing
- `snapshot -i` saves tokens — shows only interactive elements
- `snapshot --diff` after actions shows only what changed
- `qprobe check` gives a one-command status overview
- Record flows early — replay is free forever
