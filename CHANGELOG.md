# @questpie/probe

## 0.3.0

### Minor Changes

- [`4be5d32`](https://github.com/questpie/probe/commit/4be5d32fe887505efa1081689407b25f2667d465) Thanks [@drepkovsky](https://github.com/drepkovsky)! - Multi-agent session isolation & collaboration

  Probe now isolates runtime state per session so multiple agents/worktrees can run concurrently without colliding, while still allowing them to share expensive infrastructure.

  - **Sessions**: all runtime state (PIDs, logs, snapshots, shots, recordings) is namespaced under `tmp/qprobe/sessions/<id>/`. The session id is auto-derived from the git worktree (distinct per worktree, stable across runs); override with `QPROBE_SESSION`. Root dir override via `QPROBE_ROOT_DIR`.
  - **Shared services** (`shared: true`): a service such as Postgres lives in a shared scope, is reused if already running, and is only stopped once the last referencing session releases it (refcounted).
  - **Setup hooks** (`setup: string[]`): commands that run once after a service is healthy (migrations, seeds), idempotent per scope. `${SESSION}` / `${PORT}` interpolation is applied to `cmd`, `env`, and `setup`.
  - **`qprobe ps --all`**: list processes across every session plus the shared scope, with an owning-session column.
  - **Per-session browser/recording**: browser session defaults to `qprobe-<sessionId>`; snapshots, screenshots, and `recording.json` are session-scoped so concurrent sessions don't clobber each other.
  - **Portless integration** (on by default): wraps service commands with [portless](https://github.com/vercel-labs/portless) for stable per-worktree `*.localhost` URLs. Gracefully falls back to localhost/port when the binary is absent; opt out via `session.portless: false` or `QPROBE_PORTLESS=0`.
  - **Compose lock**: `compose up` is serialized per session to prevent concurrent runs from double-spawning services.

  New config: top-level `session: { id?, portless? }`, and service fields `shared?` and `setup?`. Backward compatible — existing single-agent setups are unaffected.

## 0.2.1

### Patch Changes

- [`3d026ee`](https://github.com/questpie/probe/commit/3d026ee7bade2b7214aa2cedd77c45bd4c21757d) Thanks [@drepkovsky](https://github.com/drepkovsky)! - Fix child process dying after ready detection — pipe stdout/stderr to log file instead of destroying streams (prevents SIGPIPE kill on macOS)

## 0.2.0

### Minor Changes

- [`907c1bc`](https://github.com/questpie/probe/commit/907c1bcbbddff9a1e0376278fb6f32eb49389f06) Thanks [@drepkovsky](https://github.com/drepkovsky)! - Hardening based on AI QA session feedback

  - **Config validation**: Validate all config fields at load time with clear, actionable error messages. Detects common typos (`command` → `cmd`, `dependsOn` → `depends`, etc.) with "Did you mean?" suggestions and config examples.
  - **`qprobe doctor` command**: New command that checks config validity, browser driver availability, port conflicts, log directory writability, and package resolvability.
  - **Better error messages**: Process manager now shows last 10 lines of output on timeout/exit failures. Explains `cd dir && cmd` shell issues and suggests `--cwd`. Compose failures suggest manual `qprobe start` fallback.
  - **Shell-aware process spawning**: Commands containing shell operators (`&&`, `|`, `;`) now spawn via `sh -c` so monorepo patterns work correctly.
  - **HTTP 429/503 auto-retry**: Auto-retries rate-limited and unavailable responses with exponential backoff, respects `Retry-After` header. New `--retries` flag.
  - **Dependencies**: Moved `agent-browser` and `@playwright/test` from peer to regular dependencies — installing qprobe installs everything.
  - **`qprobe init` improvements**: Now adds `@questpie/probe` as devDependency to the project's package.json and suggests running `qprobe doctor`.

### Patch Changes

- [`db31010`](https://github.com/questpie/probe/commit/db31010c3578b0ebcad0b79a5ac06df55e59356e) Thanks [@drepkovsky](https://github.com/drepkovsky)! - Add README with install instructions, command reference, and config example
