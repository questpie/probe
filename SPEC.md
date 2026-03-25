# QUESTPIE Probe — Full Specification v1.0

> `@questpie/probe` · CLI: `qprobe` · MIT License
> Dev testing CLI for AI coding agents.

---

## 0. Princípy

1. **CLI-first** — žiadny MCP server, žiadna schema overhead. SKILL.md + bash.
2. **Logs before browser** — 90% debugging ide cez `qprobe logs` a `qprobe http`, nie cez browser.
3. **Record → replay free** — agent nahráva, Playwright replayuje. Zero AI tokenov na regresiu.
4. **Adapter pattern** — `agent-browser` default, `playwright-cli` optional. Rovnaké CLI, iný backend.
5. **Compose** — DB + server + browser ako atomická operácia s dependency grafom.
6. **Token-efficient** — compact snapshoty, diff mode, log filtering. Agent číta len čo potrebuje.

---

## 1. CLI Command Reference

### 1.1 Process Management

```
qprobe start <name> "<cmd>" [options]
```
Spustí proces na pozadí, pipeuje stdout/stderr do log file, čaká na ready pattern.

| Flag | Default | Popis |
|------|---------|-------|
| `--ready "<pattern>"` | — | Regex/string v stdout signalizujúci ready state |
| `--timeout <duration>` | `60s` | Max čakanie na ready |
| `--port <number>` | — | Port pre health checks a auto baseUrl |
| `--env KEY=VAL` | — | Environment variables (opakovateľné) |
| `--cwd <path>` | `.` | Working directory |

**Príklady:**
```bash
qprobe start db "docker compose up postgres" --ready "ready to accept" --timeout 30s
qprobe start server "bun dev" --ready "ready on" --port 3000
qprobe start worker "bun run jobs" --ready "worker started"
```

**Čo sa deje:**
1. Spawn child process s detached stdio
2. Pipe stdout → `tmp/qprobe/logs/<name>.log` (timestamped, level-parsed)
3. Pipe stderr → rovnaký file s `ERROR` level
4. Monitor stdout pre `--ready` pattern match
5. Vráť control keď ready ALEBO timeout (exit 1)
6. Ulož PID do `tmp/qprobe/pids/<name>.pid`
7. Process prežíva medzi CLI callmi (daemon pattern)

---

```
qprobe stop <name|--all>
```
Graceful stop (SIGTERM → wait 5s → SIGKILL).

```
qprobe restart <name>
```
Stop + start s pôvodným configom (uloženým v `tmp/qprobe/state/<name>.json`).

```
qprobe ps
```
Zoznam bežiacich procesov.

**Output:**
```
NAME     PID    PORT   STATUS   UPTIME    CPU   MEM
db       12345  5432   ready    5m 23s    0.3%  128MB
server   12346  3000   ready    5m 20s    2.1%  256MB
worker   12347  —      ready    5m 18s    0.1%  64MB
```

| Flag | Popis |
|------|-------|
| `--json` | JSON output pre strojové spracovanie |

---

```
qprobe health <url> [options]
```
Polling health check — čaká kým URL odpovie HTTP 200.

| Flag | Default | Popis |
|------|---------|-------|
| `--interval <duration>` | `1s` | Interval medzi pokusmi |
| `--timeout <duration>` | `30s` | Max celkový čas |
| `--status <code>` | `200` | Očakávaný status code |

**Príklad:**
```bash
qprobe health http://localhost:3000/api/health --timeout 60s
# ✅ http://localhost:3000/api/health responding (200 OK, 45ms) after 3.2s
```

---

### 1.2 Compose

```
qprobe compose up [options]
qprobe compose down
qprobe compose restart [name]
qprobe compose status
```

Číta `qprobe.config.ts` (alebo `--config <path>`), resolvne dependency graf, spustí v správnom poradí.

| Flag | Popis |
|------|-------|
| `--only <name,...>` | Spusti len vybrané services (+ ich dependencie) |
| `--skip <name,...>` | Preskočí vybrané services |
| `--no-health` | Nečakaj na health checks |

**`qprobe compose down`** zastaví v opačnom poradí (browser → server → db).

---

### 1.3 Log Management

```
qprobe logs <name> [options]
```

| Flag | Default | Popis |
|------|---------|-------|
| `--follow` / `-f` | false | tail -f mode |
| `--lines <n>` / `-n` | 50 | Počet riadkov |
| `--grep "<pattern>"` | — | Filter pattern (regex) |
| `--level <level>` | all | `error`, `warn`, `info`, `debug` |
| `--since <duration>` | — | Časový filter (`5m`, `1h`, `2d`) |
| `--json` | false | JSON output |

**Špeciálne targets:**
```bash
qprobe logs --all                    # Všetky procesy merged, prefixed [name]
qprobe logs --all --grep "ERROR"     # Errory zo všetkých
qprobe logs --unified                # Procesy + browser console + network
```

**Log formát na disku (`tmp/qprobe/logs/<name>.log`):**
```
2026-03-24T14:30:01.123Z INFO  Ready on http://localhost:3000
2026-03-24T14:30:02.456Z ERROR TypeError: Cannot read property 'id' of undefined
2026-03-24T14:30:02.457Z ERROR     at getUser (src/routes/users.ts:42:15)
```

---

### 1.4 HTTP Requests

```
qprobe http <method> <path> [options]
```

Posiela HTTP request proti bežiacemu serveru. Auto-resolvne baseUrl z configu alebo z `--port` flagu.

| Flag | Default | Popis |
|------|---------|-------|
| `--base <url>` | z configu | Base URL |
| `--data <json>` / `-d` | — | Request body (JSON) |
| `--header <k:v>` / `-H` | — | Headers (opakovateľné) |
| `--token <jwt>` | — | Bearer token (shortcut pre Auth header) |
| `--status <code>` | — | Assert expected status (fail ak iný) |
| `--jq <expr>` | — | JQ-style filter na response |
| `--raw` | false | Raw output (bez pretty-print) |
| `--timing` | false | Ukáž request timing breakdown |
| `--verbose` / `-v` | false | Ukáž request + response headers |

**Príklady:**
```bash
# GET
qprobe http GET /api/users
# Output:
# 200 OK (45ms)
# [
#   { "id": 1, "name": "Admin", "email": "admin@test.com" },
#   { "id": 2, "name": "User", "email": "user@test.com" }
# ]

# POST s telom
qprobe http POST /api/users -d '{"name":"New","email":"new@test.com"}'
# 201 Created (123ms)
# { "id": 3, "name": "New", "email": "new@test.com" }

# S autentifikáciou
qprobe http GET /api/admin/stats --token "eyJhbGci..."

# Assert status
qprobe http GET /api/health --status 200
# ✅ 200 OK (12ms)

qprobe http GET /api/nonexistent --status 404
# ✅ 404 Not Found (8ms)

qprobe http GET /api/broken --status 200
# ❌ Expected 200, got 500 Internal Server Error (234ms)
# Response body:
# { "error": "Database connection failed" }

# JQ filter
qprobe http GET /api/users --jq ".[0].name"
# "Admin"

# Verbose
qprobe http POST /api/login -d '{"email":"a@b.com","pass":"123"}' -v
# → POST http://localhost:3000/api/login
# → Content-Type: application/json
# → Body: {"email":"a@b.com","pass":"123"}
# ← 200 OK (89ms)
# ← Set-Cookie: session=abc123; HttpOnly
# { "token": "eyJ...", "user": { "id": 1 } }
```

**BaseUrl resolution order:**
1. `--base` flag
2. `qprobe.config.ts` → `browser.baseUrl`
3. Prvý service s `port` v compose → `http://localhost:<port>`
4. `http://localhost:3000` (fallback)

---

### 1.5 Browser Control

```
qprobe browser <subcommand> [options]
```

**Global browser flags:**
| Flag | Default | Popis |
|------|---------|-------|
| `--driver <name>` | `agent-browser` | `agent-browser` alebo `playwright` |
| `--headed` | false | Viditeľný browser |
| `--session <name>` | `qprobe` | Session name (pre viacero instancií) |

#### Navigation

```bash
qprobe browser open <url>          # Naviguj na URL
qprobe browser open /login         # Relatívne ku baseUrl
qprobe browser back                # Browser back
qprobe browser forward             # Browser forward
qprobe browser reload              # Reload
qprobe browser url                 # Vypíš aktuálnu URL
qprobe browser title               # Vypíš page title
qprobe browser close               # Zavri browser
```

#### Snapshot

```bash
qprobe browser snapshot [options]
```

| Flag | Short | Popis |
|------|-------|-------|
| `--interactive` | `-i` | Len interactive elements (buttons, inputs, links) |
| `--compact` | `-c` | Remove empty structural elements |
| `--depth <n>` | `-d` | Limit tree depth |
| `--selector <css>` | `-s` | Scope na CSS selector |
| `--diff` | — | Ukáž len zmeny od posledného snapshotu |

**Výstup (-i -c):**
```
- heading "Login" [ref=@e1]
- textbox "Email" [ref=@e2]
- textbox "Password" [ref=@e3]
- button "Sign In" [ref=@e4]
- link "Forgot password?" [ref=@e5]
```

**Diff výstup:**
```
URL: /login → /dashboard
REMOVED: textbox "Email" [@e2]
REMOVED: textbox "Password" [@e3]  
REMOVED: button "Sign In" [@e4]
ADDED:   heading "Dashboard" [@e6]
ADDED:   button "Logout" [@e7]
ADDED:   table (12 rows) [@e8]
```

#### Interaction

```bash
qprobe browser click <ref|selector>
qprobe browser dblclick <ref|selector>
qprobe browser fill <ref|selector> "<value>"
qprobe browser type "<text>"               # Type at current focus
qprobe browser select <ref|selector> "<value>"
qprobe browser check <ref|selector>
qprobe browser uncheck <ref|selector>
qprobe browser press <key>                 # Enter, Tab, Escape, Control+a
qprobe browser hover <ref|selector>
qprobe browser scroll <direction> [px]     # up/down/left/right
qprobe browser focus <ref|selector>
qprobe browser upload <ref|selector> <file>
```

Ref format: `@e1`, `@e2` (z posledného snapshotu).
Selector format: `#id`, `.class`, `button[type="submit"]` (CSS selector).

#### Inspection

```bash
qprobe browser console [options]           # Browser console messages
qprobe browser console --level error       # Len errory
qprobe browser console --clear             # Vymaž buffer
qprobe browser console --json              # JSON formát

qprobe browser errors                      # Uncaught JS exceptions
qprobe browser errors --clear

qprobe browser network [options]           # HTTP request log
qprobe browser network --failed            # Len 4xx/5xx
qprobe browser network --grep "api/"       # Filter URL
qprobe browser network --method POST       # Filter method
qprobe browser network --json

qprobe browser eval "<js>"                 # Execute JavaScript, vráť výsledok
qprobe browser text [selector]             # Extrahuj text content
```

#### Screenshots

```bash
qprobe browser screenshot [path]           # → tmp/qprobe/shots/shot-001.png
qprobe browser screenshot --annotate       # S @e ref anotáciami
qprobe browser screenshot --full           # Full page (scroll)
qprobe browser screenshot --selector "#main"
```

#### Waiting

```bash
qprobe browser wait <ref|selector>         # Čakaj kým element existuje
qprobe browser wait --url "<pattern>"      # Čakaj na URL zmenu
qprobe browser wait --text "<text>"        # Čakaj na text na stránke
qprobe browser wait --network idle         # Čakaj kým network je idle
qprobe browser wait --timeout 10s          # Custom timeout (default 30s)
```

---

### 1.6 Test Recording & Replay

```bash
qprobe record start "<name>"               # Začni nahrávanie
# ... browser commands sa automaticky zaznamenávajú ...
qprobe record stop                         # Ulož + generuj Playwright test
qprobe record cancel                       # Zruš bez uloženia
```

```bash
qprobe replay "<name>" [options]           # Spusti Playwright test
qprobe replay --all [options]              # Spusti všetky recordings
```

| Flag | Popis |
|------|-------|
| `--headed` | Viditeľný browser |
| `--browser <name>` | `chromium`, `firefox`, `webkit` |
| `--parallel` | Parallel execution |
| `--report` | Generuj HTML report |
| `--base <url>` | Override baseUrl |
| `--retries <n>` | Retry count pre flaky testy |

```bash
qprobe recordings list                     # Zoznam recordings
qprobe recordings show "<name>"            # Ukáž akcie
qprobe recordings delete "<name>"
qprobe recordings export "<name>"          # Export ako standalone Playwright projekt
```

**Recording ukladá do:**
```
tests/qprobe/
├── recordings/
│   ├── login-flow.json          ← akcie + metadata
│   └── login-flow.spec.ts       ← vygenerovaný Playwright test
├── snapshots/                    ← a11y snapshoty pre diff/assertions
│   ├── login-flow-001.yaml
│   └── login-flow-002.yaml
└── screenshots/                  ← screenshots pre visual regression
    └── login-flow-final.png
```

---

### 1.7 Quick Check & Assertions

```bash
qprobe check [url]                         # All-in-one health check
```

**Output:**
```
Checking http://localhost:3000...
  ✅ HTTP 200 OK (45ms)
  ✅ Page title: "My App - Dashboard"
  ✅ No console errors
  ⚠️  2 console warnings
  ✅ No network errors (4xx/5xx)
  ℹ️  15 interactive elements
  ℹ️  3 services running (db, server, worker)
```

```bash
qprobe assert <assertion>                  # Fail s exit code 1 ak assertion neplati
```

| Assertion | Popis |
|-----------|-------|
| `text "<text>"` | Stránka obsahuje text |
| `no-text "<text>"` | Stránka NEobsahuje text |
| `element <ref\|selector>` | Element existuje |
| `element <ref\|selector> --text "<t>"` | Element má text |
| `url "<pattern>"` | URL matchuje pattern |
| `title "<text>"` | Page title obsahuje text |
| `status <code> <path>` | HTTP endpoint vracia status |
| `no-errors` | Žiadne JS errory v browser console |
| `no-network-errors` | Žiadne 4xx/5xx v network log |

---

## 2. Config File

**`qprobe.config.ts`** (načítaný cez `c12` + `jiti` — Unjs stack):

```typescript
import { defineConfig } from '@questpie/probe'

export default defineConfig({
  // Services pre compose
  services: {
    db: {
      cmd: 'docker compose up postgres',
      ready: 'ready to accept connections',
      health: 'http://localhost:5432',
      stop: 'docker compose down postgres',   // custom stop command
    },
    server: {
      cmd: 'bun dev',
      ready: 'ready on http://localhost:3000',
      port: 3000,
      health: '/api/health',                  // relatívne ku http://localhost:<port>
      depends: ['db'],
      env: {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dev',
      },
    },
    admin: {
      cmd: 'bun run admin:dev',
      ready: 'ready on http://localhost:3001',
      port: 3001,
      depends: ['server'],
    },
  },

  // Browser
  browser: {
    driver: 'agent-browser',    // 'agent-browser' | 'playwright'
    headless: true,
    baseUrl: 'http://localhost:3000',
    session: 'qprobe',
  },

  // HTTP
  http: {
    baseUrl: 'http://localhost:3000',   // fallback ak browser.baseUrl nie je set
    headers: {
      'Content-Type': 'application/json',
    },
    // auth: { bearer: 'token' },       // default auth pre všetky requesty
  },

  // Logs
  logs: {
    dir: 'tmp/qprobe/logs',
    maxSize: '10mb',
    browserConsole: true,
  },

  // Tests
  tests: {
    dir: 'tests/qprobe',
    timeout: 30_000,
  },
})
```

---

## 3. SKILL.md (pre AI agentov)

```markdown
---
name: qprobe
description: >
  Dev testing CLI for AI agents. Manages dev servers, reads logs,
  controls browsers, sends HTTP requests, records and replays tests.
  Use when: testing apps, starting servers, checking logs, debugging
  runtime errors, recording test flows, making API calls.
  Triggers: "test this", "start the server", "check logs", "any errors?",
  "record a test", "run tests", "call the API", "check network"
---

# qprobe — QUESTPIE Probe

Dev testing CLI. Start servers, read logs, control browsers, test APIs, record tests.

## Quick Reference

### Start Stack
qprobe compose up              # start all from config
qprobe start <n> "<cmd>" --ready "<pattern>" --port <p>
qprobe stop <n|--all>
qprobe ps                      # list running services

### Check Before Browsing
qprobe check [url]             # health + console + network summary
qprobe logs <n> --grep "ERROR" # search process logs  
qprobe logs --all              # merged log stream
qprobe http GET /api/health    # quick API check

### HTTP Requests (auto-resolves baseUrl)
qprobe http GET /api/users
qprobe http POST /api/users -d '{"name":"New"}'
qprobe http GET /api/me --token "eyJ..."
qprobe http DELETE /api/users/1 --status 204

### Browser (only if you need visual)
qprobe browser open /login
qprobe browser snapshot -i      # interactive elements with @refs
qprobe browser snapshot --diff  # what changed since last
qprobe browser click @e1
qprobe browser fill @e2 "text"
qprobe browser console          # browser console output
qprobe browser network --failed # failed HTTP requests
qprobe browser screenshot --annotate

### Record & Replay
qprobe record start "name"     # begin recording
# ... do browser + http commands ...
qprobe record stop             # save + generate Playwright test
qprobe replay "name"           # pure Playwright, zero AI tokens
qprobe replay --all            # regression suite

### Assertions
qprobe assert no-errors        # no JS console errors
qprobe assert text "Dashboard" # page contains text
qprobe assert status 200 /api/health

## Tips
- Always check logs BEFORE opening browser
- Use `qprobe check` for quick overview
- `snapshot -i` saves tokens (interactive only)
- `snapshot --diff` shows only changes
- HTTP commands are cheaper than browser for API testing
- Record flows → replay is FREE (no AI tokens)
```

---

## 4. File Structure

```
@questpie/probe/
├── src/
│   ├── cli.ts                     # Entry point, command router
│   │
│   ├── commands/
│   │   ├── start.ts               # qprobe start
│   │   ├── stop.ts                # qprobe stop  
│   │   ├── restart.ts             # qprobe restart
│   │   ├── ps.ts                  # qprobe ps
│   │   ├── health.ts              # qprobe health
│   │   ├── compose.ts             # qprobe compose up/down
│   │   ├── logs.ts                # qprobe logs
│   │   ├── http.ts                # qprobe http
│   │   ├── browser.ts             # qprobe browser *
│   │   ├── record.ts              # qprobe record start/stop
│   │   ├── replay.ts              # qprobe replay
│   │   ├── recordings.ts          # qprobe recordings list/show/delete
│   │   ├── check.ts               # qprobe check
│   │   └── assert.ts              # qprobe assert
│   │
│   ├── core/
│   │   ├── process-manager.ts     # Spawn, ready detection, PID management
│   │   ├── log-writer.ts          # Timestamped log file writer
│   │   ├── log-reader.ts          # Read, filter, grep, follow
│   │   ├── compose-engine.ts      # Dependency resolution, ordered start/stop
│   │   ├── config.ts              # Load qprobe.config.ts via c12
│   │   ├── http-client.ts         # HTTP request engine (fetch-based)
│   │   └── state.ts               # tmp/qprobe state management
│   │
│   ├── browser/
│   │   ├── types.ts               # BrowserDriver interface
│   │   ├── agent-browser.ts       # agent-browser CLI wrapper
│   │   ├── playwright.ts          # playwright-cli wrapper
│   │   ├── snapshot-diff.ts       # Structural diff between a11y snapshots
│   │   └── ref-resolver.ts        # @e ref → CSS selector resolution
│   │
│   ├── testing/
│   │   ├── recorder.ts            # Action recording engine
│   │   ├── codegen.ts             # Recording → Playwright .spec.ts
│   │   ├── replayer.ts            # Run Playwright tests
│   │   └── reporter.ts            # Format test results
│   │
│   └── utils/
│       ├── output.ts              # Formatted terminal output (colors, spinners)
│       ├── duration.ts            # Parse "30s", "5m", "1h"
│       └── port.ts                # Find free port, resolve service ports
│
├── skills/
│   └── qprobe/
│       └── SKILL.md               # Agent skill file
│
├── templates/
│   └── qprobe.config.ts           # Template pre `qprobe init`
│
├── package.json
├── tsconfig.json
├── tsup.config.ts                 # Bundle config
└── README.md
```

---

## 5. Dependency Graph

```
@questpie/probe
├── citty                    # CLI framework (Unjs, lightweight)
├── c12                      # Config loading (Unjs)
├── jiti                     # TS config JIT compilation
├── consola                  # Pretty console output (Unjs)
├── defu                     # Object merging (Unjs)
├── ofetch                   # HTTP client (Unjs, fetch-based)
├── chokidar                 # File watching (log follow)
└── tinyexec                 # Child process spawning
    
Peer dependencies:
├── agent-browser            # Browser driver (CLI, npm install -g)
└── @playwright/test         # Test runner (optional, pre replay)

Optional:
└── @playwright/cli          # Alternatívny browser driver
```

**Build:** `tsup` → single CJS + ESM bundle
**Binary:** `bin: { "qprobe": "./dist/cli.mjs" }` v package.json

---

## 6. Runtime File Layout

Všetko v `tmp/qprobe/` (gitignored):

```
tmp/qprobe/
├── pids/
│   ├── db.pid
│   ├── server.pid
│   └── worker.pid
├── state/
│   ├── db.json             # Start config pre restart
│   ├── server.json
│   └── worker.json
├── logs/
│   ├── db.log
│   ├── server.log
│   ├── worker.log
│   └── browser.log         # Browser console + network
├── snapshots/
│   ├── current.yaml        # Posledný snapshot (pre diff)
│   └── previous.yaml       # Predposledný (pre diff)
└── shots/
    ├── shot-001.png
    └── shot-002-annotated.png
```

Test recordings v `tests/qprobe/` (commitované do repo):

```
tests/qprobe/
├── recordings/
│   ├── login-flow.json
│   ├── login-flow.spec.ts
│   ├── create-user.json
│   └── create-user.spec.ts
├── snapshots/
│   ├── login-flow-001.yaml
│   └── login-flow-002.yaml
└── playwright.config.ts       # Auto-generated Playwright config
```

---

## 7. Implementation Priority

### Phase 1 — Core (Sprint 1: ~10 dní)
- [ ] CLI scaffold (`citty` + command router)
- [ ] Config loading (`c12` + `qprobe.config.ts`)
- [ ] `qprobe start` / `stop` / `ps` / `health`
- [ ] Log writer (timestamped to file)
- [ ] `qprobe logs` (read, `--grep`, `--follow`, `--level`)
- [ ] `qprobe http` (GET/POST/PUT/DELETE, auto baseUrl, `--status`)
- [ ] `qprobe check` (health + quick summary)
- [ ] SKILL.md

### Phase 2 — Browser (Sprint 2: ~7 dní)
- [ ] Browser adapter interface
- [ ] `agent-browser` adapter (`open`, `snapshot`, `click`, `fill`, `console`, `errors`, `network`, `screenshot`)
- [ ] `qprobe browser *` commands
- [ ] Snapshot diff engine

### Phase 3 — Recording (Sprint 3: ~5 dní)
- [ ] Recorder engine (intercept browser commands)
- [ ] Ref → selector resolution
- [ ] Playwright codegen
- [ ] `qprobe record start/stop`
- [ ] `qprobe replay` (spawn Playwright)

### Phase 4 — Compose (Sprint 4: ~5 dní)
- [ ] Dependency graph resolver
- [ ] `qprobe compose up/down/restart/status`
- [ ] Ordered start with health check gates
- [ ] Error handling (service fail → rollback)

### Phase 5 — Polish (Sprint 5: ~5 dní)
- [ ] `playwright-cli` adapter
- [ ] `qprobe assert` commands
- [ ] `qprobe replay --all --report`
- [ ] `qprobe init` (scaffold config)
- [ ] `qprobe recordings export` (standalone Playwright project)
- [ ] npm publish, GitHub Actions CI

---

## 8. Exit Codes

| Code | Význam |
|------|--------|
| 0 | Success |
| 1 | Assertion failed / command error |
| 2 | Process timeout (ready pattern not matched) |
| 3 | Health check failed |
| 4 | Config error |
| 5 | Browser driver not found |
| 6 | Replay test failure |

---

## 9. Environment Variables

| Variable | Popis |
|----------|-------|
| `QPROBE_CONFIG` | Cesta ku config súboru |
| `QPROBE_BASE_URL` | Override base URL |
| `QPROBE_BROWSER_DRIVER` | `agent-browser` alebo `playwright` |
| `QPROBE_LOG_DIR` | Override log directory |
| `QPROBE_HEADLESS` | `true`/`false` |
| `QPROBE_TIMEOUT` | Default timeout pre health checks |
| `NO_COLOR` | Disable colored output |

---

## 10. Budúcnosť (v2+)

- **QUESTPIE plugin** — app-aware testing pre QUESTPIE admin (routes, collections, blocks)
- **CI mode** — `qprobe ci` spustí compose, všetky replay testy, report, cleanup
- **Visual regression** — screenshot comparison medzi recordings
- **Watch mode** — `qprobe watch` rerunuje testy pri file change
- **Remote** — `qprobe connect <ssh>` pre testing na remote serveroch
- **MCP wrapper** — optional MCP server pre agentov bez shell access
