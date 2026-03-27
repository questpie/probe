# agent-browser Reference

`agent-browser` is the default browser driver powering `qprobe browser` commands. It's a Rust CLI that runs a persistent headless Chrome daemon, exposes an accessibility-tree-based snapshot system, and provides element refs (`@e1`, `@e2`) for token-efficient browser automation.

**Install:** `npm i -g agent-browser` or `brew install agent-browser` or `cargo install agent-browser`
**Setup:** `agent-browser install` (downloads Chrome)

---

## How It Works

1. **Navigate** to a URL
2. **Snapshot** the page → get accessibility tree with `@e` refs
3. **Interact** using refs from snapshot
4. **Re-snapshot** after DOM changes to get fresh refs

qprobe wraps this cycle as `qprobe browser <command>`. Under the hood, every qprobe browser command maps to `agent-browser --session qprobe <command>`.

---

## Element Refs (`@e1`, `@e2`, ...)

Snapshots assign sequential refs to interactive elements:

```
@e1 [input type="email"]         — Input field
@e2 [button] "Submit"            — Button with label
@e3 [link] "Home"                — Hyperlink
@e4 [Iframe] "payment-frame"     — Nested iframe
```

### Ref Lifecycle — IMPORTANT

Refs are **invalidated** when:
- Page navigation occurs
- Form submission completes
- Dynamic content loads (modals, dropdowns, SPAs)

**Always re-snapshot after these events before reusing refs.** Old refs will point to wrong or missing elements.

### Iframe Handling

Iframe content is auto-inlined into the snapshot. Refs inside iframes work directly — no need to switch frame context manually.

---

## Session Management

agent-browser uses named sessions to persist browser state between CLI calls.

```bash
# qprobe uses --session qprobe by default
agent-browser --session qprobe open <url>

# Session auto-saves cookies + localStorage on close
agent-browser --session-name myapp open <url>

# List active sessions
agent-browser session list

# Manual state save/restore
agent-browser state save ./auth.json
agent-browser state load ./auth.json
agent-browser state list
agent-browser state clear <name>
```

qprobe automatically uses `--session qprobe` for all browser commands. The session persists between CLI invocations — you don't lose cookies/auth between `qprobe browser` calls.

---

## Authentication

### Option 1: Import from Running Browser
```bash
agent-browser --auto-connect state save ./auth.json
agent-browser --state ./auth.json open <url>
```

### Option 2: Persistent Profile
```bash
agent-browser --profile ~/.myapp open <url>
```

### Option 3: Auth Vault (encrypted credentials)
```bash
echo "password" | agent-browser auth save myapp --url <url> --username user --password-stdin
agent-browser auth login myapp
```

### Option 4: Session Names (cookies auto-saved)
```bash
agent-browser --session-name myapp open <url>
# Close → state auto-saved → reopen → still logged in
```

---

## Network Inspection (agent-browser native)

Beyond what qprobe wraps, agent-browser supports:

```bash
# Filter by resource type, method, status
agent-browser network requests --type xhr,fetch
agent-browser network requests --method POST
agent-browser network requests --status 2xx

# Full request/response details
agent-browser network request <requestId>

# Block requests (useful for testing offline/error states)
agent-browser network route "**/api/*" --abort

# HAR recording (full network capture)
agent-browser network har start
agent-browser network har stop ./capture.har
```

---

## Diff & Comparison

```bash
# Snapshot diff (what changed since last snapshot)
agent-browser diff snapshot
agent-browser diff snapshot --baseline before.txt

# Visual pixel diff between screenshots
agent-browser diff screenshot --baseline before.png

# Compare two different URLs
agent-browser diff url <url1> <url2>
agent-browser diff url <url1> <url2> --selector "#main"
```

qprobe exposes this as `qprobe browser snapshot --diff`.

---

## Semantic Locators (alternative to refs)

When refs are stale or you know the element by text/role:

```bash
agent-browser find text "Sign In" click
agent-browser find role button click --name "Submit"
```

---

## Viewport & Device Emulation

```bash
agent-browser set viewport 1920 1080        # desktop
agent-browser set viewport 1920 1080 2      # 2x retina
agent-browser set device "iPhone 14"        # device emulation (viewport + UA)
```

---

## Advanced Features

### JavaScript Execution
```bash
agent-browser eval 'document.title'
agent-browser eval --stdin <<'EOF'          # multi-line JS
  const rows = document.querySelectorAll('tr');
  return rows.length;
EOF
agent-browser eval -b "$(echo -n 'code' | base64)"  # base64-encoded
```

### Clipboard
```bash
agent-browser clipboard read
agent-browser clipboard write "text"
agent-browser clipboard copy
agent-browser clipboard paste
```

### Dialog Handling (alerts, confirms, prompts)
```bash
agent-browser dialog accept
agent-browser dialog accept "input text"
agent-browser dialog dismiss
agent-browser dialog status
```

### Downloads
```bash
agent-browser download @e1 ./file.pdf
agent-browser wait --download ./output.zip
agent-browser --download-path ./downloads open <url>
```

### Frame Switching
```bash
agent-browser frame @e2          # switch to iframe
agent-browser frame main         # back to main frame
```

### PDF Export
```bash
agent-browser pdf output.pdf
```

### Streaming (live view)
```bash
agent-browser stream enable              # WebSocket on auto port
agent-browser stream enable --port 9223  # specific port
agent-browser stream status
agent-browser stream disable
```

### Batch Operations
Pipe JSON array of commands:
```bash
echo '[["open","https://example.com"],["snapshot","-i"],["click","@e1"]]' | agent-browser batch --json
agent-browser batch --bail   # stop on first error
```

---

## Browser Modes

| Mode | Flag | Use case |
|------|------|----------|
| Headless (default) | _(none)_ | Fast, no visual display |
| Headed | `--headed` | Debugging, visual verification |
| Auto-connect | `--auto-connect` | Connect to running Chrome |
| CDP | `--cdp 9222` | Explicit DevTools Protocol port |
| Lightpanda | `--engine lightpanda` | Faster, less memory than Chrome |

---

## Configuration

Create `agent-browser.json` in project root:
```json
{
  "headed": true,
  "proxy": "http://localhost:8080",
  "profile": "./browser-data"
}
```

Priority: `~/.agent-browser/config.json` < `./agent-browser.json` < env vars < CLI flags

---

## Security & Boundaries

```bash
AGENT_BROWSER_ALLOWED_DOMAINS=example.com    # restrict navigation
AGENT_BROWSER_ACTION_POLICY=policy.json      # gate destructive actions
AGENT_BROWSER_MAX_OUTPUT=50000               # limit output size
AGENT_BROWSER_ENCRYPTION_KEY=secret          # encrypt saved state
```

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AGENT_BROWSER_DEFAULT_TIMEOUT` | Timeout in ms | 25000 |
| `AGENT_BROWSER_IDLE_TIMEOUT_MS` | Auto-shutdown after inactivity | — |
| `AGENT_BROWSER_HEADED` | Headed mode (`1`) | `0` |
| `AGENT_BROWSER_COLOR_SCHEME` | `dark` / `light` | — |
| `AGENT_BROWSER_CONFIG` | Custom config path | — |

---

## qprobe ↔ agent-browser Mapping

| qprobe command | agent-browser equivalent |
|----------------|------------------------|
| `qprobe browser open <url>` | `agent-browser --session qprobe open <url>` |
| `qprobe browser snapshot -i` | `agent-browser --session qprobe snapshot -i` |
| `qprobe browser click @e1` | `agent-browser --session qprobe click @e1` |
| `qprobe browser fill @e1 "text"` | `agent-browser --session qprobe fill @e1 "text"` |
| `qprobe browser screenshot` | `agent-browser --session qprobe screenshot` |
| `qprobe browser console` | _(qprobe aggregates from log files)_ |
| `qprobe browser network` | _(qprobe formats agent-browser network output)_ |
| `qprobe browser snapshot --diff` | `agent-browser --session qprobe diff snapshot` |

Features **not yet wrapped** by qprobe (use agent-browser directly):
- Network route blocking / HAR recording
- Viewport / device emulation
- Clipboard operations
- Dialog handling
- Downloads
- Batch operations
- Streaming
- PDF export
- Semantic locators (`find text`, `find role`)
