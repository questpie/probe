import { describe, expect, test } from 'bun:test'
import { AgentBrowserDriver } from '../../src/browser/agent-browser'

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
