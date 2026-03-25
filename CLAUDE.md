# QUESTPIE Probe

Dev testing CLI for AI coding agents. Orchestrates dev servers, aggregates logs, controls browsers, sends HTTP requests, records and replays tests.

**Package:** `@questpie/probe`
**CLI command:** `qprobe`
**License:** MIT
**Brand:** Always write QUESTPIE in all caps.

## Tech Stack

- **Runtime:** Bun (primary), Node.js compatible
- **Language:** TypeScript, strict mode
- **CLI framework:** `citty` (Unjs — lightweight, TypeScript-native)
- **Config loading:** `c12` + `jiti` (Unjs — loads `qprobe.config.ts`)
- **Console output:** `consola` (Unjs — pretty output, log levels)
- **HTTP client:** `ofetch` (Unjs — fetch-based, auto JSON)
- **Object merging:** `defu` (Unjs — deep defaults)
- **Child processes:** `tinyexec` or native `child_process`
- **File watching:** `chokidar` (log follow mode)
- **Build:** `tsdown` (Rolldown-based, ESM-only, Oxc DTS generation)
- **Lint/Format:** `biome` (Rust-based, replaces ESLint + Prettier)
- **Browser driver (peer dep):** `agent-browser` (Vercel — Rust CLI, persistent daemon)
- **Test runner (optional peer dep):** `@playwright/test` (for replay)
- **Optional browser driver:** `@playwright/cli` (Microsoft — cross-browser fallback)

## Commands

```
qprobe start <n> "<cmd>" --ready "<pattern>" --port <n> --timeout <dur>
qprobe stop <name|--all>
qprobe restart <n>
qprobe ps [--json]
qprobe health <url> --interval <dur> --timeout <dur> --status <code>
qprobe compose up [--only <names>] [--skip <names>] [--no-health]
qprobe compose down
qprobe compose restart [name]
qprobe compose status
qprobe logs <n> [--follow] [--lines <n>] [--grep "<pat>"] [--level <lvl>] [--since <dur>]
qprobe logs --all [--grep "<pat>"]
qprobe logs --unified
qprobe http <METHOD> <path> [-d <json>] [-H <k:v>] [--token <jwt>] [--status <code>] [--jq <expr>] [--raw] [-v]
qprobe check [url]
qprobe browser open <url>
qprobe browser snapshot [-i] [-c] [-d <n>] [-s <css>] [--diff]
qprobe browser click <ref|selector>
qprobe browser fill <ref|selector> "<value>"
qprobe browser select <ref|selector> "<value>"
qprobe browser press <key>
qprobe browser type "<text>"
qprobe browser console [--level <lvl>] [--clear] [--json]
qprobe browser errors [--clear]
qprobe browser network [--failed] [--method <m>] [--grep "<pat>"] [--json]
qprobe browser screenshot [path] [--annotate] [--full] [--selector <css>]
qprobe browser wait <ref|selector|--url|--text|--network> [--timeout <dur>]
qprobe browser eval "<js>"
qprobe browser text [selector]
qprobe browser back|forward|reload|url|title|close
qprobe record start "<n>"
qprobe record stop
qprobe record cancel
qprobe replay "<n>" [--headed] [--browser <n>] [--parallel] [--report] [--retries <n>]
qprobe replay --all [options]
qprobe recordings list|show|delete|export
qprobe assert text|no-text|element|url|title|status|no-errors|no-network-errors
qprobe init
```

## Architecture

```
src/
├── cli.ts                        # Entry: parse args, route to command
├── commands/                     # One file per command group
│   ├── start.ts                  # qprobe start
│   ├── stop.ts                   # qprobe stop
│   ├── restart.ts
│   ├── ps.ts
│   ├── health.ts
│   ├── compose.ts                # qprobe compose up/down/restart/status
│   ├── logs.ts                   # qprobe logs
│   ├── http.ts                   # qprobe http
│   ├── browser.ts                # qprobe browser *
│   ├── record.ts                 # qprobe record start/stop
│   ├── replay.ts                 # qprobe replay
│   ├── recordings.ts             # qprobe recordings list/show/delete/export
│   ├── check.ts                  # qprobe check
│   ├── assert.ts                 # qprobe assert
│   └── init.ts                   # qprobe init
├── core/
│   ├── process-manager.ts        # Spawn, ready detection, PID files, daemon
│   ├── log-writer.ts             # Timestamped log file writing
│   ├── log-reader.ts             # Read, filter, grep, follow, level parse
│   ├── compose-engine.ts         # Dependency graph, ordered start/stop
│   ├── config.ts                 # Load qprobe.config.ts via c12
│   ├── http-client.ts            # ofetch wrapper, baseUrl resolution
│   └── state.ts                  # tmp/qprobe/* state management
├── browser/
│   ├── types.ts                  # BrowserDriver interface
│   ├── agent-browser.ts          # agent-browser CLI wrapper (default)
│   ├── playwright.ts             # playwright-cli wrapper (optional)
│   ├── snapshot-diff.ts          # Structural diff between a11y snapshots
│   └── ref-resolver.ts           # @e ref → CSS selector resolution
├── testing/
│   ├── recorder.ts               # Action recording during browser commands
│   ├── codegen.ts                # Recording JSON → Playwright .spec.ts
│   ├── replayer.ts               # Spawn Playwright test runner
│   └── reporter.ts               # Format test results
└── utils/
    ├── output.ts                 # consola wrappers, spinners, tables
    ├── duration.ts               # Parse "30s", "5m", "1h" → ms
    └── port.ts                   # Find free port, resolve service ports
```

## Runtime Files

```
tmp/qprobe/                       # gitignored
├── pids/<n>.pid                # PID files for daemon processes
├── state/<n>.json              # Start config for restart
├── logs/<n>.log                # Timestamped process logs
├── logs/browser.log              # Browser console + network
├── snapshots/current.yaml        # Last snapshot (for --diff)
├── snapshots/previous.yaml       # Previous snapshot
└── shots/shot-NNN.png            # Screenshots

tests/qprobe/                     # committed to repo
├── recordings/<n>.json         # Recorded actions
├── recordings/<n>.spec.ts      # Generated Playwright tests
├── snapshots/                    # A11y snapshots for assertions
└── playwright.config.ts          # Auto-generated
```

## Config File Format

```typescript
// qprobe.config.ts
import { defineConfig } from '@questpie/probe'

export default defineConfig({
  services: {
    db: {
      cmd: 'docker compose up postgres',
      ready: 'ready to accept connections',
      health: 'http://localhost:5432',
      stop: 'docker compose down postgres',
    },
    server: {
      cmd: 'bun dev',
      ready: 'ready on http://localhost:3000',
      port: 3000,
      health: '/api/health',
      depends: ['db'],
      env: { DATABASE_URL: 'postgresql://...' },
    },
  },
  browser: {
    driver: 'agent-browser',    // 'agent-browser' | 'playwright'
    baseUrl: 'http://localhost:3000',
    headless: true,
    session: 'qprobe',
  },
  http: {
    baseUrl: 'http://localhost:3000',
    headers: { 'Content-Type': 'application/json' },
  },
  logs: {
    dir: 'tmp/qprobe/logs',
    maxSize: '10mb',
    browserConsole: true,
  },
  tests: {
    dir: 'tests/qprobe',
    timeout: 30_000,
  },
})
```

## Browser Driver Interface

```typescript
export interface BrowserDriver {
  open(url: string): Promise<void>
  snapshot(opts?: SnapshotOpts): Promise<string>
  click(ref: string): Promise<void>
  fill(ref: string, value: string): Promise<void>
  select(ref: string, value: string): Promise<void>
  press(key: string): Promise<void>
  type(text: string): Promise<void>
  screenshot(opts?: ScreenshotOpts): Promise<string>
  eval(js: string): Promise<string>
  console(opts?: ConsoleOpts): Promise<ConsoleEntry[]>
  errors(): Promise<ErrorEntry[]>
  network(opts?: NetworkOpts): Promise<NetworkEntry[]>
  wait(opts: WaitOpts): Promise<void>
  close(): Promise<void>
}
```

## Implementation Order

Build in this order. Each phase is independently useful.

### Phase 1 — Core (start here)
1. `src/cli.ts` — citty setup, command routing
2. `src/core/config.ts` — c12 config loading
3. `src/core/process-manager.ts` — spawn, ready detection, PID daemon
4. `src/core/log-writer.ts` — timestamped file writing
5. `src/core/log-reader.ts` — read, grep, follow, level filter
6. `src/commands/start.ts`, `stop.ts`, `ps.ts`, `health.ts`
7. `src/commands/logs.ts`
8. `src/core/http-client.ts` — ofetch wrapper, baseUrl resolution
9. `src/commands/http.ts`
10. `src/commands/check.ts`

### Phase 2 — Browser
11. `src/browser/types.ts` — BrowserDriver interface
12. `src/browser/agent-browser.ts` — shell exec wrapper
13. `src/commands/browser.ts` — all subcommands
14. `src/browser/snapshot-diff.ts`

### Phase 3 — Recording
15. `src/testing/recorder.ts` — intercept browser commands
16. `src/browser/ref-resolver.ts` — @e → CSS selector
17. `src/testing/codegen.ts` — JSON → .spec.ts
18. `src/commands/record.ts`
19. `src/testing/replayer.ts` — spawn playwright
20. `src/commands/replay.ts`, `recordings.ts`

### Phase 4 — Compose
21. `src/core/compose-engine.ts` — dep graph, ordered start/stop
22. `src/commands/compose.ts`

### Phase 5 — Polish
23. `src/commands/assert.ts`
24. `src/browser/playwright.ts` — optional driver
25. `src/commands/init.ts` — scaffold config
26. `src/testing/reporter.ts` — HTML report

## Exit Codes

0 = success, 1 = assertion/command error, 2 = process timeout, 3 = health check failed, 4 = config error, 5 = browser driver not found, 6 = replay test failure

## Code Style

- Strict TypeScript, no `any`, `isolatedDeclarations` enabled
- ESM-only — no CJS output, use `import type` for type-only imports
- Use `verbatimModuleSyntax` — explicit `import type` / `export type`
- Use Unjs ecosystem (citty, c12, consola, ofetch, defu, tinyexec)
- Lint/format with Biome (not ESLint/Prettier)
- Async/await everywhere, no callbacks
- One export per file for commands
- Process manager is a singleton — processes survive between CLI calls via PID files
- All user-facing output goes through consola (never raw console.log)
- Log format: `YYYY-MM-DDTHH:mm:ss.sssZ LEVEL message`
- Duration parsing: "30s" → 30000, "5m" → 300000, "1h" → 3600000
- Shell commands via tinyexec with timeout
- agent-browser commands: `agent-browser --session qprobe <subcmd>`
- Config loaded once per CLI invocation via `loadConfig()` from c12
- Build with tsdown (Rolldown + Oxc), ESM output only
- Use `node:` prefix for built-in modules (e.g., `import { spawn } from 'node:child_process'`)

## Testing

- Unit tests: `bun test` (vitest compatible)
- Integration tests: spawn qprobe against fixture apps in `tests/fixtures/`
- The tool itself uses Playwright for replay — but qprobe's own tests are unit/integration, not E2E
