---
name: qprobe-recording
description: "QUESTPIE Probe test recording and replay. Record browser interactions, auto-generate Playwright tests, replay without AI tokens for regression testing. Use when: recording a test flow, creating regression tests, replaying tests, running test suite, checking for regressions after code changes. Triggers: 'record a test', 'save this as a test', 'replay tests', 'run regression', 'check if it still works', 'run all tests'. Use whenever user wants to capture a flow for future verification."
---

# qprobe — Recording & Replay

Record browser flows → generate Playwright tests → replay with zero AI tokens.

**Install:** `npm install -g @questpie/probe`

## Record

```bash
qprobe record start "login-flow"
# ... do browser actions (they're automatically captured) ...
qprobe browser open /login
qprobe browser fill @e1 "admin@test.com"
qprobe browser fill @e2 "password123"
qprobe browser click @e3
qprobe browser wait --url "/dashboard"
qprobe assert text "Dashboard"
qprobe record stop
# ✅ Recording saved: tests/qprobe/recordings/login-flow.json
# ✅ Playwright test: tests/qprobe/recordings/login-flow.spec.ts
```

## Replay (Zero AI Tokens)

```bash
qprobe replay "login-flow"              # run one test
qprobe replay --all                     # run all recordings
qprobe replay --all --headed            # visible browser
qprobe replay --all --browser firefox   # cross-browser
qprobe replay --all --report            # HTML report
qprobe replay --all --retries 2         # retry flaky tests
qprobe replay --all --base https://staging.myapp.com  # against staging
```

## Manage Recordings

```bash
qprobe recordings list                  # list all
qprobe recordings show "login-flow"     # show steps
qprobe recordings delete "old-test"     # delete
qprobe recordings export "login-flow"   # standalone Playwright project
```

## How It Works

1. `record start` activates capture mode
2. Every `qprobe browser` command is recorded with both `@e` ref AND CSS selector
3. `record stop` saves JSON recording + generates `.spec.ts` Playwright test
4. `replay` runs the Playwright test directly — no AI, no LLM, no tokens
5. Tests are committed to repo in `tests/qprobe/recordings/`

## Tips

- **Record early** — capture login, CRUD, critical paths as you build them
- **Replay after every change** — `qprobe replay --all` catches regressions instantly
- **Replay is free** — pure Playwright, runs in <5s per test
- **Edit `.spec.ts`** to add custom assertions beyond what was recorded
- **Export for CI** — `qprobe recordings export` creates standalone test project
