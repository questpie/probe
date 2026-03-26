# @questpie/probe

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
