import { describe, expect, test } from 'bun:test'
import { generatePlaywrightTest } from '../../src/testing/codegen'
import type { Recording } from '../../src/testing/recorder'

const makeRecording = (actions: Array<{ command: string; args: string[] }>): Recording => ({
  name: 'test-recording',
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:01:00.000Z',
  baseUrl: 'http://localhost:3000',
  actions: actions.map((a) => ({ ...a, timestamp: '2026-01-01T00:00:00.000Z' })),
})

describe('generatePlaywrightTest', () => {
  test('generates valid test structure', () => {
    const code = generatePlaywrightTest(makeRecording([]))
    expect(code).toContain("import { test, expect } from '@playwright/test'")
    expect(code).toContain("test('test-recording'")
    expect(code).toContain('async ({ page })')
  })

  test('generates page.goto for browser open', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'browser open', args: ['http://localhost:3000/login'] }]),
    )
    expect(code).toContain("await page.goto('http://localhost:3000/login')")
  })

  test('generates click', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'browser click', args: ['@e1'] }]),
    )
    expect(code).toContain("page.locator('@e1').click()")
  })

  test('generates fill', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'browser fill', args: ['@e2', 'hello world'] }]),
    )
    expect(code).toContain("page.locator('@e2').fill('hello world')")
  })

  test('generates press', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'browser press', args: ['Enter'] }]),
    )
    expect(code).toContain("page.keyboard.press('Enter')")
  })

  test('generates type', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'browser type', args: ['some text'] }]),
    )
    expect(code).toContain("page.keyboard.type('some text')")
  })

  test('generates screenshot', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'browser screenshot', args: ['output.png'] }]),
    )
    expect(code).toContain("page.screenshot")
  })

  test('generates navigation', () => {
    const code = generatePlaywrightTest(
      makeRecording([
        { command: 'browser back', args: [] },
        { command: 'browser forward', args: [] },
        { command: 'browser reload', args: [] },
      ]),
    )
    expect(code).toContain('page.goBack()')
    expect(code).toContain('page.goForward()')
    expect(code).toContain('page.reload()')
  })

  test('generates assertion code', () => {
    const code = generatePlaywrightTest(
      makeRecording([
        { command: 'assert text', args: ['Dashboard'] },
        { command: 'assert no-text', args: ['Login'] },
      ]),
    )
    expect(code).toContain("toContainText('Dashboard')")
    expect(code).toContain("not.toContainText('Login')")
  })

  test('unknown commands become comments', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'unknown-cmd', args: ['arg1'] }]),
    )
    expect(code).toContain('// unknown-cmd arg1')
  })

  test('escapes single quotes in strings', () => {
    const code = generatePlaywrightTest(
      makeRecording([{ command: 'browser fill', args: ['@e1', "it's a test"] }]),
    )
    expect(code).toContain("\\'s")
  })
})
