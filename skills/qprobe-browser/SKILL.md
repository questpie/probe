---
name: qprobe-browser
description: "QUESTPIE Probe browser control. Accessibility tree snapshots with @e refs, click, fill, screenshot, console logs, network monitoring, JS errors, snapshot diffs. Powered by agent-browser. Use when: testing web UI, checking browser console, inspecting network requests, taking screenshots, filling forms, clicking buttons, checking for JS errors. Triggers: 'open the browser', 'check the page', 'click the button', 'fill the form', 'any console errors', 'network tab', 'screenshot', 'what does the page look like'. Use even for 'check if the UI works' or 'test the frontend'."
---

# qprobe — Browser Control

Token-efficient browser automation via accessibility tree snapshots and `@e` refs.

**Install:** `npm install -g @questpie/probe`

## Core Workflow

```bash
qprobe browser open http://localhost:3000/login
qprobe browser snapshot -i            # interactive elements only (~200 tokens)
# - textbox "Email" [@e1]
# - textbox "Password" [@e2]
# - button "Sign In" [@e3]

qprobe browser fill @e1 "admin@test.com"
qprobe browser fill @e2 "password123"
qprobe browser click @e3
qprobe browser wait --url "/dashboard"
qprobe browser snapshot --diff         # only what changed
```

## Snapshot Flags

| Flag | Short | Effect |
|------|-------|--------|
| `--interactive` | `-i` | Only buttons, inputs, links (recommended) |
| `--compact` | `-c` | Remove empty structural elements |
| `--depth <n>` | `-d` | Limit tree depth |
| `--selector <css>` | `-s` | Scope to element |
| `--diff` | | Show changes since last snapshot |

**Always use `-i` by default.** Full snapshots waste tokens on decorative elements.

## Interaction (via @e refs or CSS selectors)

```bash
qprobe browser click @e3
qprobe browser fill @e1 "text"
qprobe browser select @e4 "value"
qprobe browser check @e5
qprobe browser press Enter
qprobe browser type "hello"
qprobe browser hover @e2
qprobe browser scroll down 500
```

## Inspection (NO BROWSER WINDOW NEEDED)

```bash
qprobe browser console                # console messages (log, warn, error)
qprobe browser console --level error  # only errors
qprobe browser errors                 # uncaught JS exceptions
qprobe browser network                # HTTP request log
qprobe browser network --failed       # only 4xx/5xx
qprobe browser eval "document.title"  # execute JS
qprobe browser text "#main"           # extract text content
```

## Screenshots

```bash
qprobe browser screenshot             # basic
qprobe browser screenshot --annotate  # with @e labels overlaid
qprobe browser screenshot --full      # full page scroll
```

## Waiting

```bash
qprobe browser wait @e1               # element exists
qprobe browser wait --url "/dashboard" # URL changed
qprobe browser wait --text "Welcome"   # text appeared
qprobe browser wait --network idle     # no pending requests
```

## Tips for Agents

- `snapshot -i` saves tokens — use it always
- `snapshot --diff` after actions — see only changes
- Check `console --level error` and `network --failed` before visual debugging
- `screenshot --annotate` is useful when you need visual context
