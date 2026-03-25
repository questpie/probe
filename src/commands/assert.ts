import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { ofetch } from 'ofetch'
import { loadProbeConfig, resolveBaseUrl } from '../core/config'
import { AgentBrowserDriver } from '../browser/agent-browser'
import { error, success } from '../utils/output'

async function getDriver(): Promise<AgentBrowserDriver> {
  const config = await loadProbeConfig()
  return new AgentBrowserDriver({
    session: config.browser?.session ?? 'qprobe',
    baseUrl: resolveBaseUrl(config),
  })
}

const textAssert = defineCommand({
  meta: { name: 'text', description: 'Assert page contains text' },
  args: {
    text: { type: 'positional', description: 'Expected text', required: true },
  },
  async run({ args }) {
    const driver = await getDriver()
    const content = await driver.text()
    if (content.includes(args.text)) {
      success(`Page contains "${args.text}"`)
    } else {
      error(`Page does not contain "${args.text}"`)
      process.exit(1)
    }
  },
}) as CommandDef

const noTextAssert = defineCommand({
  meta: { name: 'no-text', description: 'Assert page does NOT contain text' },
  args: {
    text: { type: 'positional', required: true },
  },
  async run({ args }) {
    const driver = await getDriver()
    const content = await driver.text()
    if (!content.includes(args.text)) {
      success(`Page does not contain "${args.text}"`)
    } else {
      error(`Page contains "${args.text}" (unexpected)`)
      process.exit(1)
    }
  },
}) as CommandDef

const elementAssert = defineCommand({
  meta: { name: 'element', description: 'Assert element exists' },
  args: {
    selector: { type: 'positional', description: 'Ref or CSS selector', required: true },
    text: { type: 'string', description: 'Assert element has this text' },
  },
  async run({ args }) {
    const driver = await getDriver()
    const snapshot = await driver.snapshot({ interactive: true, compact: true })
    if (snapshot.includes(args.selector)) {
      success(`Element "${args.selector}" exists`)
    } else {
      error(`Element "${args.selector}" not found`)
      process.exit(1)
    }
  },
}) as CommandDef

const urlAssert = defineCommand({
  meta: { name: 'url', description: 'Assert URL matches pattern' },
  args: {
    pattern: { type: 'positional', description: 'URL pattern', required: true },
  },
  async run({ args }) {
    const driver = await getDriver()
    const currentUrl = await driver.url()
    const regex = new RegExp(args.pattern)
    if (regex.test(currentUrl)) {
      success(`URL matches "${args.pattern}" (${currentUrl})`)
    } else {
      error(`URL "${currentUrl}" does not match "${args.pattern}"`)
      process.exit(1)
    }
  },
}) as CommandDef

const titleAssert = defineCommand({
  meta: { name: 'title', description: 'Assert page title contains text' },
  args: {
    text: { type: 'positional', required: true },
  },
  async run({ args }) {
    const driver = await getDriver()
    const pageTitle = await driver.title()
    if (pageTitle.includes(args.text)) {
      success(`Title contains "${args.text}" (${pageTitle})`)
    } else {
      error(`Title "${pageTitle}" does not contain "${args.text}"`)
      process.exit(1)
    }
  },
}) as CommandDef

const statusAssert = defineCommand({
  meta: { name: 'status', description: 'Assert HTTP endpoint returns status' },
  args: {
    code: { type: 'positional', description: 'Expected status code', required: true },
    path: { type: 'positional', description: 'URL path', required: true },
  },
  async run({ args }) {
    const config = await loadProbeConfig()
    const base = resolveBaseUrl(config)
    const url = args.path.startsWith('http') ? args.path : `${base}${args.path}`
    const expected = Number(args.code)

    try {
      const response = await ofetch.raw(url, { ignoreResponseError: true })
      if (response.status === expected) {
        success(`${url} returned ${expected}`)
      } else {
        error(`${url} returned ${response.status}, expected ${expected}`)
        process.exit(1)
      }
    } catch (err) {
      error(`Failed to reach ${url}: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  },
}) as CommandDef

const noErrorsAssert = defineCommand({
  meta: { name: 'no-errors', description: 'Assert no JS console errors' },
  args: {},
  async run() {
    const driver = await getDriver()
    const errs = await driver.errors()
    if (errs.length === 0) {
      success('No JS errors')
    } else {
      error(`Found ${errs.length} JS error(s):`)
      for (const e of errs) {
        error(`  ${e.message}`)
      }
      process.exit(1)
    }
  },
}) as CommandDef

const noNetworkErrorsAssert = defineCommand({
  meta: { name: 'no-network-errors', description: 'Assert no 4xx/5xx network errors' },
  args: {},
  async run() {
    const driver = await getDriver()
    const entries = await driver.network({ failed: true })
    if (entries.length === 0) {
      success('No network errors')
    } else {
      error(`Found ${entries.length} network error(s):`)
      for (const e of entries) {
        error(`  ${e.method} ${e.status} ${e.url}`)
      }
      process.exit(1)
    }
  },
}) as CommandDef

const command = defineCommand({
  meta: {
    name: 'assert',
    description: 'Run assertions against browser/server state',
  },
  subCommands: {
    text: textAssert,
    'no-text': noTextAssert,
    element: elementAssert,
    url: urlAssert,
    title: titleAssert,
    status: statusAssert,
    'no-errors': noErrorsAssert,
    'no-network-errors': noNetworkErrorsAssert,
  },
})
export default command as CommandDef
