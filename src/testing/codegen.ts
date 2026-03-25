import type { Recording } from './recorder'

export function generatePlaywrightTest(recording: Recording): string {
  const lines: string[] = []

  lines.push("import { test, expect } from '@playwright/test'")
  lines.push('')
  lines.push(`test('${escapeString(recording.name)}', async ({ page }) => {`)

  for (const action of recording.actions) {
    const code = actionToPlaywright(action.command, action.args)
    if (code) {
      lines.push(`  ${code}`)
    }
  }

  lines.push('})')
  lines.push('')

  return lines.join('\n')
}

function actionToPlaywright(command: string, args: string[]): string | null {
  switch (command) {
    case 'browser open':
      return `await page.goto('${escapeString(args[0] ?? '')}')`

    case 'browser click':
      return `await page.locator('${escapeSelector(args[0] ?? '')}').click()`

    case 'browser dblclick':
      return `await page.locator('${escapeSelector(args[0] ?? '')}').dblclick()`

    case 'browser fill':
      return `await page.locator('${escapeSelector(args[0] ?? '')}').fill('${escapeString(args[1] ?? '')}')`

    case 'browser select':
      return `await page.locator('${escapeSelector(args[0] ?? '')}').selectOption('${escapeString(args[1] ?? '')}')`

    case 'browser check':
      return `await page.locator('${escapeSelector(args[0] ?? '')}').check()`

    case 'browser uncheck':
      return `await page.locator('${escapeSelector(args[0] ?? '')}').uncheck()`

    case 'browser press':
      return `await page.keyboard.press('${escapeString(args[0] ?? '')}')`

    case 'browser type':
      return `await page.keyboard.type('${escapeString(args[0] ?? '')}')`

    case 'browser hover':
      return `await page.locator('${escapeSelector(args[0] ?? '')}').hover()`

    case 'browser screenshot':
      return `await page.screenshot({ path: '${escapeString(args[0] ?? 'screenshot.png')}' })`

    case 'browser wait':
      if (args[0]) {
        return `await page.locator('${escapeSelector(args[0])}').waitFor()`
      }
      return `await page.waitForLoadState('networkidle')`

    case 'browser eval':
      return `await page.evaluate(() => { ${args[0] ?? ''} })`

    case 'browser back':
      return 'await page.goBack()'

    case 'browser forward':
      return 'await page.goForward()'

    case 'browser reload':
      return 'await page.reload()'

    case 'http GET':
    case 'http POST':
    case 'http PUT':
    case 'http DELETE':
    case 'http PATCH': {
      const method = command.split(' ')[1]!
      const url = args[0] ?? '/'
      return `await page.request.${method.toLowerCase()}('${escapeString(url)}')`
    }

    case 'assert text':
      return `await expect(page.locator('body')).toContainText('${escapeString(args[0] ?? '')}')`

    case 'assert no-text':
      return `await expect(page.locator('body')).not.toContainText('${escapeString(args[0] ?? '')}')`

    case 'assert element':
      return `await expect(page.locator('${escapeSelector(args[0] ?? '')}')).toBeVisible()`

    case 'assert url':
      return `await expect(page).toHaveURL(/${escapeString(args[0] ?? '')}/)`

    case 'assert title':
      return `await expect(page).toHaveTitle(/${escapeString(args[0] ?? '')}/)`

    default:
      return `// ${command} ${args.join(' ')}`
  }
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function escapeSelector(s: string): string {
  // @e refs become role-based locators in Playwright
  if (s.startsWith('@e')) {
    return s
  }
  return escapeString(s)
}
