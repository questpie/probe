---
"@questpie/probe": minor
---

Multi-agent session isolation & collaboration

Probe now isolates runtime state per session so multiple agents/worktrees can run concurrently without colliding, while still allowing them to share expensive infrastructure.

- **Sessions**: all runtime state (PIDs, logs, snapshots, shots, recordings) is namespaced under `tmp/qprobe/sessions/<id>/`. The session id is auto-derived from the git worktree (distinct per worktree, stable across runs); override with `QPROBE_SESSION`. Root dir override via `QPROBE_ROOT_DIR`.
- **Shared services** (`shared: true`): a service such as Postgres lives in a shared scope, is reused if already running, and is only stopped once the last referencing session releases it (refcounted).
- **Setup hooks** (`setup: string[]`): commands that run once after a service is healthy (migrations, seeds), idempotent per scope. `${SESSION}` / `${PORT}` interpolation is applied to `cmd`, `env`, and `setup`.
- **`qprobe ps --all`**: list processes across every session plus the shared scope, with an owning-session column.
- **Per-session browser/recording**: browser session defaults to `qprobe-<sessionId>`; snapshots, screenshots, and `recording.json` are session-scoped so concurrent sessions don't clobber each other.
- **Portless integration** (on by default): wraps service commands with [portless](https://github.com/vercel-labs/portless) for stable per-worktree `*.localhost` URLs. Gracefully falls back to localhost/port when the binary is absent; opt out via `session.portless: false` or `QPROBE_PORTLESS=0`.
- **Compose lock**: `compose up` is serialized per session to prevent concurrent runs from double-spawning services.

New config: top-level `session: { id?, portless? }`, and service fields `shared?` and `setup?`. Backward compatible — existing single-agent setups are unaffected.
