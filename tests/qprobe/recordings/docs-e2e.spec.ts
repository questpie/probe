import { test, expect } from '@playwright/test'

test('docs-e2e', async ({ page }) => {
  await page.goto('http://localhost:3200/docs')
  await page.locator('e35').click()
  await page.locator('e18').click()
  await page.goto('http://localhost:3200/docs/commands/http')
})
