# Browser Control Reference

Powered by `agent-browser` (default) or `playwright-cli` (optional). Uses accessibility tree snapshots with compact `@e` refs.

> For full agent-browser internals (ref lifecycle, session management, auth, network HAR, diffs, advanced features), see `references/agent-browser.md`.

## Navigation

```bash
qprobe browser open <url>         # navigate (absolute or relative to baseUrl)
qprobe browser open /login        # relative
qprobe browser back               # browser back
qprobe browser forward            # browser forward
qprobe browser reload             # reload current page
qprobe browser url                # print current URL
qprobe browser title              # print page title
qprobe browser close              # close browser
```

## Snapshot — How the Agent Sees the Page

```bash
qprobe browser snapshot [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--interactive` | `-i` | Only interactive elements (buttons, inputs, links) |
| `--compact` | `-c` | Remove empty structural elements |
| `--depth <n>` | `-d` | Limit tree depth |
| `--selector <css>` | `-s` | Scope to CSS selector |
| `--diff` | | Show only changes since last snapshot |

### Output Example (-i -c)
```
- heading "Login" [@e1]
- textbox "Email" [@e2]
- textbox "Password" [@e3]
- button "Sign In" [@e4]
- link "Forgot password?" [@e5]
```

~200-400 tokens for a typical page. Each element gets a stable ref like `@e1`.

### Diff Output (--diff)
```
URL: /login → /dashboard
REMOVED: textbox "Email" [@e2]
REMOVED: textbox "Password" [@e3]
REMOVED: button "Sign In" [@e4]
ADDED:   heading "Dashboard" [@e6]
ADDED:   button "Logout" [@e7]
ADDED:   table (12 rows) [@e8]
```

**Use `-i` by default.** Full snapshots include decorative elements that waste tokens. Add `-c` for even more compression. Use `--diff` after actions to see only what changed.

## Interaction

All interaction commands accept `@e` refs (from snapshot) or CSS selectors.

```bash
qprobe browser click @e4                    # click
qprobe browser dblclick @e4                 # double-click
qprobe browser fill @e2 "admin@test.com"    # clear + fill
qprobe browser type "hello"                 # type at current focus
qprobe browser select @e3 "option-value"    # select dropdown
qprobe browser check @e5                    # check checkbox
qprobe browser uncheck @e5                  # uncheck
qprobe browser press Enter                  # keyboard key
qprobe browser press Tab
qprobe browser press Control+a
qprobe browser hover @e1                    # hover
qprobe browser scroll down 500              # scroll pixels
qprobe browser scroll up
qprobe browser focus @e2                    # focus element
qprobe browser upload @e6 ./file.pdf        # file upload
```

## Console & Errors

```bash
qprobe browser console                      # all console messages
qprobe browser console --level error         # only errors
qprobe browser console --level warn          # warnings and above
qprobe browser console --clear               # clear buffer
qprobe browser console --json                # machine-readable

qprobe browser errors                        # uncaught JS exceptions only
qprobe browser errors --clear
```

Output:
```
[error] TypeError: Cannot read property 'map' of undefined
    at UserList (src/components/UserList.tsx:23:15)
[warn]  Each child in a list should have a unique "key" prop
[log]   API response: 200 OK
```

## Network

```bash
qprobe browser network                       # all HTTP requests
qprobe browser network --failed              # only 4xx/5xx
qprobe browser network --method POST         # filter by method
qprobe browser network --grep "api/"         # filter by URL pattern
qprobe browser network --json                # machine-readable
```

Output:
```
200 GET  /api/health         12ms
200 GET  /api/users          89ms
201 POST /api/users          123ms
500 POST /api/orders         234ms  ← FAILED
404 GET  /api/nonexistent    8ms    ← FAILED
```

## Screenshots

```bash
qprobe browser screenshot                    # save to tmp/qprobe/shots/
qprobe browser screenshot ./my-shot.png      # custom path
qprobe browser screenshot --annotate         # overlay @e ref labels
qprobe browser screenshot --full             # full page scroll capture
qprobe browser screenshot --selector "#main" # capture specific element
```

Annotated screenshots overlay numbered labels `[1] @e1`, `[2] @e2` on interactive elements — useful for multimodal AI models that can reason about visual layout.

## Waiting

```bash
qprobe browser wait @e1                      # wait for element to exist
qprobe browser wait "#loading" --hidden      # wait for element to disappear
qprobe browser wait --url "/dashboard"       # wait for URL change
qprobe browser wait --text "Welcome"         # wait for text to appear
qprobe browser wait --network idle           # wait for no pending requests
qprobe browser wait --timeout 10s            # custom timeout (default 30s)
```

## JavaScript Execution

```bash
qprobe browser eval "document.title"
# "My App - Dashboard"

qprobe browser eval "document.querySelectorAll('tr').length"
# 12

qprobe browser eval "localStorage.getItem('token')"
# "eyJhbG..."

qprobe browser text                          # extract all text content
qprobe browser text "#main"                  # text from specific element
```

## Common Patterns

### Login Flow
```bash
qprobe browser open /login
qprobe browser snapshot -i
qprobe browser fill @e1 "admin@test.com"
qprobe browser fill @e2 "password"
qprobe browser click @e3
qprobe browser wait --url "/dashboard"
qprobe browser snapshot --diff
```

### Check for Errors After Action
```bash
qprobe browser click @e5                    # submit form
qprobe browser wait --network idle
qprobe browser console --level error         # any JS errors?
qprobe browser network --failed              # any failed requests?
qprobe browser snapshot --diff               # what changed?
```

### Debug Why Page Looks Wrong
```bash
qprobe browser screenshot --annotate         # see the visual state
qprobe browser console --level error         # JS errors?
qprobe browser network --failed              # failed API calls?
qprobe browser eval "document.querySelector('.error')?.textContent"
```

## Driver Selection

```bash
# Default: agent-browser (token-efficient, Rust CLI, persistent daemon)
qprobe browser open /login

# Playwright: cross-browser, network interception, test codegen
qprobe browser open /login --driver playwright
qprobe browser open /login --driver playwright --browser firefox
```

Set default in `qprobe.config.ts`:
```typescript
browser: { driver: 'agent-browser' }  // or 'playwright'
```
