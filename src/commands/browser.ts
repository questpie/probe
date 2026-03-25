import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { loadProbeConfig, resolveBaseUrl } from '../core/config'
import type { BrowserDriver } from '../browser/types'
import { AgentBrowserDriver } from '../browser/agent-browser'
import { recordAction } from '../testing/recorder'
import { error, info, json as jsonOut, log, success } from '../utils/output'
import { parseDuration } from '../utils/duration'

function record(command: string, ...args: string[]): void {
  recordAction(`browser ${command}`, args)
}

async function getDriver(args: {
  driver?: string
  headed?: boolean
  session?: string
}): Promise<BrowserDriver> {
  const config = await loadProbeConfig()
  const driverName = args.driver ?? config.browser?.driver ?? 'agent-browser'

  if (driverName !== 'agent-browser') {
    error(`Driver "${driverName}" is not yet supported. Use agent-browser.`)
    process.exit(5)
  }

  return new AgentBrowserDriver({
    session: args.session ?? config.browser?.session ?? 'qprobe',
    headed: args.headed ?? !(config.browser?.headless ?? true),
    baseUrl: resolveBaseUrl(config),
  })
}

// ── Navigation ──────────────────────────────────────────

const open = defineCommand({
  meta: { name: 'open', description: 'Navigate to URL' },
  args: {
    url: { type: 'positional', description: 'URL to open', required: true },
    driver: { type: 'string', description: 'Browser driver' },
    headed: { type: 'boolean', description: 'Show browser window' },
    session: { type: 'string', description: 'Session name' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.open(args.url)
    record('open', args.url)
    success(`Opened ${args.url}`)
  },
}) as CommandDef

const back = defineCommand({
  meta: { name: 'back', description: 'Go back' },
  args: {
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.back()
    record('back')
    success('Navigated back')
  },
}) as CommandDef

const forward = defineCommand({
  meta: { name: 'forward', description: 'Go forward' },
  args: {
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.forward()
    record('forward')
    success('Navigated forward')
  },
}) as CommandDef

const reload = defineCommand({
  meta: { name: 'reload', description: 'Reload page' },
  args: {
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.reload()
    record('reload')
    success('Reloaded')
  },
}) as CommandDef

const url = defineCommand({
  meta: { name: 'url', description: 'Print current URL' },
  args: {
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    log(await driver.url())
  },
}) as CommandDef

const title = defineCommand({
  meta: { name: 'title', description: 'Print page title' },
  args: {
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    log(await driver.title())
  },
}) as CommandDef

const close = defineCommand({
  meta: { name: 'close', description: 'Close browser' },
  args: {
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.close()
    success('Browser closed')
  },
}) as CommandDef

// ── Snapshot ────────────────────────────────────────────

const snapshot = defineCommand({
  meta: { name: 'snapshot', description: 'Get accessibility tree snapshot' },
  args: {
    interactive: { type: 'boolean', alias: 'i', description: 'Interactive elements only' },
    compact: { type: 'boolean', alias: 'c', description: 'Remove empty structural elements' },
    depth: { type: 'string', alias: 'd', description: 'Limit tree depth' },
    selector: { type: 'string', alias: 's', description: 'Scope to CSS selector' },
    diff: { type: 'boolean', description: 'Show changes since last snapshot' },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    const result = await driver.snapshot({
      interactive: args.interactive,
      compact: args.compact,
      depth: args.depth ? Number(args.depth) : undefined,
      selector: args.selector,
      diff: args.diff,
    })
    log(result)
  },
}) as CommandDef

// ── Interaction ─────────────────────────────────────────

const click = defineCommand({
  meta: { name: 'click', description: 'Click element' },
  args: {
    ref: { type: 'positional', description: 'Ref (@e1) or CSS selector', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.click(args.ref)
    record('click', args.ref)
    success(`Clicked ${args.ref}`)
  },
}) as CommandDef

const dblclick = defineCommand({
  meta: { name: 'dblclick', description: 'Double-click element' },
  args: {
    ref: { type: 'positional', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.dblclick(args.ref)
    record('dblclick', args.ref)
    success(`Double-clicked ${args.ref}`)
  },
}) as CommandDef

const fill = defineCommand({
  meta: { name: 'fill', description: 'Fill input field' },
  args: {
    ref: { type: 'positional', description: 'Ref or selector', required: true },
    value: { type: 'positional', description: 'Value to fill', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.fill(args.ref, args.value)
    record('fill', args.ref, args.value)
    success(`Filled ${args.ref}`)
  },
}) as CommandDef

const selectCmd = defineCommand({
  meta: { name: 'select', description: 'Select dropdown value' },
  args: {
    ref: { type: 'positional', required: true },
    value: { type: 'positional', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.select(args.ref, args.value)
    record('select', args.ref, args.value)
    success(`Selected "${args.value}" in ${args.ref}`)
  },
}) as CommandDef

const checkCmd = defineCommand({
  meta: { name: 'check', description: 'Check checkbox' },
  args: {
    ref: { type: 'positional', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.check(args.ref)
    record('check', args.ref)
    success(`Checked ${args.ref}`)
  },
}) as CommandDef

const uncheckCmd = defineCommand({
  meta: { name: 'uncheck', description: 'Uncheck checkbox' },
  args: {
    ref: { type: 'positional', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.uncheck(args.ref)
    record('uncheck', args.ref)
    success(`Unchecked ${args.ref}`)
  },
}) as CommandDef

const press = defineCommand({
  meta: { name: 'press', description: 'Press keyboard key' },
  args: {
    key: { type: 'positional', description: 'Key to press (Enter, Tab, Escape...)', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.press(args.key)
    record('press', args.key)
    success(`Pressed ${args.key}`)
  },
}) as CommandDef

const typeCmd = defineCommand({
  meta: { name: 'type', description: 'Type text at current focus' },
  args: {
    text: { type: 'positional', description: 'Text to type', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.type(args.text)
    record('type', args.text)
    success('Typed text')
  },
}) as CommandDef

const hover = defineCommand({
  meta: { name: 'hover', description: 'Hover over element' },
  args: {
    ref: { type: 'positional', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.hover(args.ref)
    success(`Hovered ${args.ref}`)
  },
}) as CommandDef

const focus = defineCommand({
  meta: { name: 'focus', description: 'Focus element' },
  args: {
    ref: { type: 'positional', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.focus(args.ref)
    success(`Focused ${args.ref}`)
  },
}) as CommandDef

const scroll = defineCommand({
  meta: { name: 'scroll', description: 'Scroll page' },
  args: {
    direction: { type: 'positional', description: 'up/down/left/right', required: true },
    px: { type: 'positional', description: 'Pixels to scroll', required: false },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.scroll(args.direction, args.px ? Number(args.px) : undefined)
    success(`Scrolled ${args.direction}`)
  },
}) as CommandDef

const upload = defineCommand({
  meta: { name: 'upload', description: 'Upload file to input' },
  args: {
    ref: { type: 'positional', required: true },
    file: { type: 'positional', description: 'File path', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    await driver.upload(args.ref, args.file)
    success(`Uploaded to ${args.ref}`)
  },
}) as CommandDef

// ── Screenshot ──────────────────────────────────────────

const screenshot = defineCommand({
  meta: { name: 'screenshot', description: 'Take screenshot' },
  args: {
    path: { type: 'positional', description: 'Output path', required: false },
    annotate: { type: 'boolean', description: 'Add @e ref annotations' },
    full: { type: 'boolean', description: 'Full page screenshot' },
    selector: { type: 'string', description: 'Scope to CSS selector' },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    const path = await driver.screenshot({
      path: args.path,
      annotate: args.annotate,
      full: args.full,
      selector: args.selector,
    })
    record('screenshot', path)
    success(`Screenshot saved: ${path}`)
  },
}) as CommandDef

// ── Inspection ──────────────────────────────────────────

const consoleCmd = defineCommand({
  meta: { name: 'console', description: 'Browser console messages' },
  args: {
    level: { type: 'string', description: 'Filter by level (log, warn, error, info)' },
    clear: { type: 'boolean', description: 'Clear console buffer' },
    json: { type: 'boolean', description: 'JSON output' },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    const entries = await driver.console({
      level: args.level as 'log' | 'warn' | 'error' | 'info' | undefined,
      clear: args.clear,
      json: args.json,
    })
    if (args.json) {
      jsonOut(entries)
    } else if (entries.length === 0) {
      info('No console messages')
    } else {
      for (const e of entries) {
        log(`[${e.level}] ${e.text}`)
      }
    }
  },
}) as CommandDef

const errors = defineCommand({
  meta: { name: 'errors', description: 'Uncaught JS exceptions' },
  args: {
    clear: { type: 'boolean', description: 'Clear error buffer' },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    if (args.clear) {
      await driver.console({ clear: true })
      success('Errors cleared')
      return
    }
    const errs = await driver.errors()
    if (errs.length === 0) {
      success('No JS errors')
    } else {
      for (const e of errs) {
        error(e.message)
        if (e.stack) log(e.stack)
      }
    }
  },
}) as CommandDef

const network = defineCommand({
  meta: { name: 'network', description: 'HTTP request log' },
  args: {
    failed: { type: 'boolean', description: 'Only 4xx/5xx responses' },
    method: { type: 'string', description: 'Filter by HTTP method' },
    grep: { type: 'string', description: 'Filter URL pattern' },
    json: { type: 'boolean', description: 'JSON output' },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    const entries = await driver.network({
      failed: args.failed,
      method: args.method,
      grep: args.grep,
      json: args.json,
    })
    if (args.json) {
      jsonOut(entries)
    } else if (entries.length === 0) {
      info('No network requests')
    } else {
      for (const e of entries) {
        log(`${e.method} ${e.status} ${e.url} (${e.duration}ms)`)
      }
    }
  },
}) as CommandDef

const evalCmd = defineCommand({
  meta: { name: 'eval', description: 'Execute JavaScript in browser' },
  args: {
    js: { type: 'positional', description: 'JavaScript expression', required: true },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    const result = await driver.eval(args.js)
    log(result)
  },
}) as CommandDef

const text = defineCommand({
  meta: { name: 'text', description: 'Extract text content' },
  args: {
    selector: { type: 'positional', description: 'CSS selector', required: false },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    const result = await driver.text(args.selector)
    log(result)
  },
}) as CommandDef

// ── Wait ────────────────────────────────────────────────

const wait = defineCommand({
  meta: { name: 'wait', description: 'Wait for condition' },
  args: {
    target: { type: 'positional', description: 'Ref or selector to wait for', required: false },
    url: { type: 'string', description: 'Wait for URL pattern' },
    text: { type: 'string', description: 'Wait for text on page' },
    network: { type: 'string', description: 'Wait for network idle' },
    timeout: { type: 'string', description: 'Timeout (e.g. 10s, 30s)', default: '30s' },
    driver: { type: 'string' },
    headed: { type: 'boolean' },
    session: { type: 'string' },
  },
  async run({ args }) {
    const driver = await getDriver(args)
    const timeoutMs = parseDuration(args.timeout)

    if (args.target) {
      const isRefInput = args.target.startsWith('@e')
      await driver.wait({
        ref: isRefInput ? args.target : undefined,
        selector: isRefInput ? undefined : args.target,
        timeout: timeoutMs,
      })
    } else if (args.url) {
      await driver.wait({ url: args.url, timeout: timeoutMs })
    } else if (args.text) {
      await driver.wait({ text: args.text, timeout: timeoutMs })
    } else if (args.network === 'idle') {
      await driver.wait({ network: 'idle', timeout: timeoutMs })
    } else {
      error('Provide a target (ref/selector), --url, --text, or --network idle')
      process.exit(1)
    }

    success('Wait condition met')
  },
}) as CommandDef

// ── Main command ────────────────────────────────────────

const command = defineCommand({
  meta: {
    name: 'browser',
    description: 'Control browser for visual testing',
  },
  subCommands: {
    open,
    back,
    forward,
    reload,
    url,
    title,
    close,
    snapshot,
    click,
    dblclick,
    fill,
    select: selectCmd,
    check: checkCmd,
    uncheck: uncheckCmd,
    press,
    type: typeCmd,
    hover,
    focus,
    scroll,
    upload,
    screenshot,
    console: consoleCmd,
    errors,
    network,
    eval: evalCmd,
    text,
    wait,
  },
})
export default command as CommandDef
