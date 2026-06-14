import { chromium } from '@playwright/test'
import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { GEOMETRY_SCAN, TOKEN_SCAN } from '../browser/design-scanners'
import { error, json as jsonOut } from '../utils/output'

interface Finding {
  layer: string
  severity: string
  selector: string
  viewport?: number
  prop?: string
  measured?: string
  expected?: string
  message: string
}

const design = defineCommand({
  meta: {
    name: 'design',
    description: 'Measure the rendered UI for layout + design-token defects (deterministic, no vision)',
  },
  args: {
    url: { type: 'positional', description: 'URL to audit', required: true },
    viewport: {
      type: 'string',
      description: 'Comma-separated viewport widths in px',
      default: '375,768,1280',
    },
    height: { type: 'string', description: 'Viewport height in px', default: '900' },
  },
  async run({ args }) {
    const url = String(args.url)
    const widths = String(args.viewport)
      .split(',')
      .map((w) => Number.parseInt(w.trim(), 10))
      .filter((w) => Number.isFinite(w) && w > 0)
    const height = Number.parseInt(String(args.height), 10) || 900
    if (widths.length === 0) {
      error('No valid viewport widths. Example: --viewport 375,768,1280')
      process.exit(2)
    }

    const browser = await chromium.launch().catch((e: Error) => {
      error(`Could not launch Chromium: ${e.message}`)
      error('Install the browser once with: npx playwright install chromium')
      process.exit(5)
    })

    const results: Array<{ viewport: number; findings: Finding[] }> = []
    try {
      const page = await browser.newPage()
      for (const width of widths) {
        await page.setViewportSize({ width, height })
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
        } catch {
          await page.goto(url, { waitUntil: 'load', timeout: 30_000 })
        }
        const geo = (await page.evaluate(GEOMETRY_SCAN)) as Finding[]
        const tok = (await page.evaluate(TOKEN_SCAN)) as Finding[]
        const findings = [...geo, ...tok].map((f) => ({ ...f, viewport: width }))
        results.push({ viewport: width, findings })
      }
    } finally {
      await browser.close()
    }

    const all = results.flatMap((r) => r.findings)
    const bySeverity: Record<string, number> = { blocking: 0, warn: 0, polish: 0 }
    for (const f of all) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1
    jsonOut({ url, total: all.length, bySeverity, results })
  },
}) as CommandDef

export default design
