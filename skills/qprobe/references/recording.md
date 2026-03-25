# Recording & Replay Reference

Record browser interactions → generate Playwright tests → replay without AI tokens.

## Recording

```bash
qprobe record start "<n>"        # begin recording
# ... perform browser and http actions ...
qprobe record stop                  # save + generate Playwright test
qprobe record cancel                # discard without saving
```

During recording, ALL `qprobe browser` and `qprobe http` commands are automatically captured. Each step records:

- Action type (navigate, click, fill, etc.)
- `@e` ref (short-term, for current session)
- CSS selector (long-term, resolved from ref, for Playwright replay)
- Values, URLs, expected states
- Before/after snapshots (optional)

### Example Recording Session

```bash
qprobe record start "create-user"

qprobe browser open /admin/users
qprobe browser snapshot -i
# - link "Add User" [@e3]
# - table (5 rows) [@e4]

qprobe browser click @e3
qprobe browser wait --url "/admin/users/new"
qprobe browser snapshot -i
# - textbox "Name" [@e5]
# - textbox "Email" [@e6]
# - select "Role" [@e7]
# - button "Save" [@e8]

qprobe browser fill @e5 "Test User"
qprobe browser fill @e6 "test@example.com"
qprobe browser select @e7 "editor"
qprobe browser click @e8
qprobe browser wait --url "/admin/users"
qprobe browser wait --text "Test User"
qprobe assert text "Test User"
qprobe assert no-errors

qprobe record stop
# ✅ Recording saved: tests/qprobe/recordings/create-user.json (8 steps)
# ✅ Playwright test: tests/qprobe/recordings/create-user.spec.ts
```

### Generated Playwright Test

```typescript
// tests/qprobe/recordings/create-user.spec.ts
import { test, expect } from '@playwright/test'

test('create-user', async ({ page }) => {
  await page.goto('/admin/users')
  await page.locator('a:has-text("Add User")').click()
  await page.waitForURL('**/admin/users/new')
  await page.locator('input[name="name"]').fill('Test User')
  await page.locator('input[name="email"]').fill('test@example.com')
  await page.locator('select[name="role"]').selectOption('editor')
  await page.locator('button:has-text("Save")').click()
  await page.waitForURL('**/admin/users')
  await expect(page.locator('body')).toContainText('Test User')
})
```

This test runs with **pure Playwright** — no AI, no LLM calls, no tokens.

## Replay

```bash
qprobe replay "<n>"              # run single recording
qprobe replay --all                 # run all recordings
```

| Flag | Description |
|------|-------------|
| `--headed` | Show visible browser |
| `--browser <name>` | `chromium`, `firefox`, `webkit` |
| `--parallel` | Run tests in parallel |
| `--report` | Generate HTML report |
| `--base <url>` | Override baseUrl |
| `--retries <n>` | Retry count for flaky tests |
| `--grep "<pattern>"` | Filter tests by name |

### Examples

```bash
# Run single test
qprobe replay "create-user"
# ✅ create-user passed (2.1s)

# Run all with visible browser
qprobe replay --all --headed

# Cross-browser
qprobe replay --all --browser firefox

# CI mode with report
qprobe replay --all --report --retries 2
# ✅ 5/5 tests passed
# 📄 Report: tests/qprobe/report/index.html

# Against staging
qprobe replay --all --base https://staging.myapp.com
```

## Managing Recordings

```bash
qprobe recordings list                  # list all recordings
# NAME           STEPS  CREATED
# login-flow     5      2026-03-24
# create-user    8      2026-03-24
# delete-user    4      2026-03-25

qprobe recordings show "create-user"    # show steps
# 1. navigate → /admin/users
# 2. click → a:has-text("Add User")
# 3. waitForUrl → /admin/users/new
# 4. fill → input[name="name"] = "Test User"
# 5. fill → input[name="email"] = "test@example.com"
# 6. select → select[name="role"] = "editor"
# 7. click → button:has-text("Save")
# 8. assert → body contains "Test User"

qprobe recordings delete "old-test"     # delete recording + spec

qprobe recordings export "create-user"  # export as standalone Playwright project
# Exports to: tests/qprobe/export/create-user/
# Includes: package.json, playwright.config.ts, test file
# Run with: cd tests/qprobe/export/create-user && npm test
```

## Recording Format

`tests/qprobe/recordings/create-user.json`:

```json
{
  "name": "create-user",
  "created": "2026-03-24T14:30:00Z",
  "baseUrl": "http://localhost:3000",
  "steps": [
    {
      "action": "navigate",
      "url": "/admin/users",
      "timestamp": "2026-03-24T14:30:01Z"
    },
    {
      "action": "click",
      "ref": "@e3",
      "selector": "a:has-text(\"Add User\")",
      "timestamp": "2026-03-24T14:30:03Z"
    },
    {
      "action": "fill",
      "ref": "@e5",
      "selector": "input[name=\"name\"]",
      "value": "Test User"
    }
  ]
}
```

Key insight: `ref` is for the agent's current session. `selector` is the resolved CSS selector for Playwright. Both are captured during recording so the test works independently.

## File Structure

```
tests/qprobe/
├── recordings/
│   ├── login-flow.json
│   ├── login-flow.spec.ts
│   ├── create-user.json
│   └── create-user.spec.ts
├── snapshots/                  # optional a11y snapshots
└── playwright.config.ts        # auto-generated
```

## Tips

- **Record important flows early** — login, CRUD, critical paths
- **Replay is free** — zero AI tokens, runs in <5s per test
- **Run `qprobe replay --all` after every code change** for instant regression
- **Export recordings** to share with team or run in CI
- **Edit generated .spec.ts** files to add custom assertions
- **Use `--retries 2`** for network-dependent tests that may be flaky
