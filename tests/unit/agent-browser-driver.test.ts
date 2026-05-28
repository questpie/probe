import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { AgentBrowserDriver } from '../../src/browser/agent-browser'
import { currentSessionPaths, resetSessionCache } from '../../src/core/session'

// Pin a deterministic session id so the derived default browser session and the
// snapshot/shots paths are stable regardless of the git worktree the suite runs in.
const SESSION = 'browser-test'
let prevSession: string | undefined

beforeAll(() => {
  prevSession = process.env.QPROBE_SESSION
  process.env.QPROBE_SESSION = SESSION
  resetSessionCache()
})

afterAll(() => {
  if (prevSession === undefined) delete process.env.QPROBE_SESSION
  else process.env.QPROBE_SESSION = prevSession
  resetSessionCache()
})

describe('AgentBrowserDriver', () => {
  test('constructor defaults', () => {
    const driver = new AgentBrowserDriver()
    // Just verify it creates without errors
    expect(driver).toBeDefined()
  })

  test('constructor with options', () => {
    const driver = new AgentBrowserDriver({
      session: 'test-session',
      headed: true,
      baseUrl: 'http://localhost:4000',
    })
    expect(driver).toBeDefined()
  })

  test('has all BrowserDriver methods', () => {
    const driver = new AgentBrowserDriver()
    // Navigation
    expect(typeof driver.open).toBe('function')
    expect(typeof driver.back).toBe('function')
    expect(typeof driver.forward).toBe('function')
    expect(typeof driver.reload).toBe('function')
    expect(typeof driver.url).toBe('function')
    expect(typeof driver.title).toBe('function')
    expect(typeof driver.close).toBe('function')
    // Snapshot
    expect(typeof driver.snapshot).toBe('function')
    // Interaction
    expect(typeof driver.click).toBe('function')
    expect(typeof driver.dblclick).toBe('function')
    expect(typeof driver.fill).toBe('function')
    expect(typeof driver.select).toBe('function')
    expect(typeof driver.check).toBe('function')
    expect(typeof driver.uncheck).toBe('function')
    expect(typeof driver.press).toBe('function')
    expect(typeof driver.type).toBe('function')
    expect(typeof driver.hover).toBe('function')
    expect(typeof driver.focus).toBe('function')
    expect(typeof driver.scroll).toBe('function')
    expect(typeof driver.upload).toBe('function')
    // Inspection
    expect(typeof driver.screenshot).toBe('function')
    expect(typeof driver.eval).toBe('function')
    expect(typeof driver.text).toBe('function')
    expect(typeof driver.console).toBe('function')
    expect(typeof driver.errors).toBe('function')
    expect(typeof driver.network).toBe('function')
    // Wait
    expect(typeof driver.wait).toBe('function')
  })
})

describe('AgentBrowserDriver session namespacing', () => {
  test('default session is derived from the active qprobe session', () => {
    const driver = new AgentBrowserDriver()
    expect(driver.sessionName).toBe(`qprobe-${SESSION}`)
  })

  test('explicit session option overrides the derived default', () => {
    const driver = new AgentBrowserDriver({ session: 'explicit' })
    expect(driver.sessionName).toBe('explicit')
  })

  test('default session is no longer the bare "qprobe"', () => {
    const driver = new AgentBrowserDriver()
    expect(driver.sessionName).not.toBe('qprobe')
  })

  test('two different qprobe sessions derive different browser sessions', () => {
    const a = new AgentBrowserDriver().sessionName
    process.env.QPROBE_SESSION = 'browser-test-other'
    resetSessionCache()
    try {
      const b = new AgentBrowserDriver().sessionName
      expect(b).toBe('qprobe-browser-test-other')
      expect(b).not.toBe(a)
    } finally {
      process.env.QPROBE_SESSION = SESSION
      resetSessionCache()
    }
  })

  test('next screenshot path is namespaced under the session shots dir', async () => {
    const driver = new AgentBrowserDriver()
    const shotsDir = currentSessionPaths().shots
    const next = await driver.nextShotPath()
    expect(next).toBe(`${shotsDir}/shot-001.png`)
    expect(next.startsWith(`tmp/qprobe/sessions/${SESSION}/shots`)).toBe(true)
  })

  test('different sessions resolve to different shot dirs', async () => {
    const a = await new AgentBrowserDriver().nextShotPath()
    process.env.QPROBE_SESSION = 'browser-test-other'
    resetSessionCache()
    try {
      const b = await new AgentBrowserDriver().nextShotPath()
      expect(b).toBe('tmp/qprobe/sessions/browser-test-other/shots/shot-001.png')
      expect(b).not.toBe(a)
    } finally {
      process.env.QPROBE_SESSION = SESSION
      resetSessionCache()
    }
  })
})
