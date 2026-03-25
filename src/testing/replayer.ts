import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { x } from 'tinyexec'
import { loadProbeConfig } from '../core/config'

export interface ReplayOptions {
  name: string
  headed?: boolean
  browser?: string
  parallel?: boolean
  report?: boolean
  retries?: number
  base?: string
}

export interface ReplayResult {
  exitCode: number
  passed: number
  failed: number
  output: string
}

export async function replayRecording(opts: ReplayOptions): Promise<ReplayResult> {
  const config = await loadProbeConfig()
  const testsDir = config.tests?.dir ?? 'tests/qprobe'
  const specPath = join(testsDir, 'recordings', `${opts.name}.spec.ts`)

  await ensurePlaywrightConfig(testsDir, opts)

  const args = ['playwright', 'test', specPath]

  if (opts.headed) args.push('--headed')
  if (opts.browser) args.push('--project', opts.browser)
  if (opts.parallel) args.push('--workers', '4')
  if (opts.retries) args.push('--retries', String(opts.retries))
  if (opts.report) args.push('--reporter', 'html')

  const result = await x('npx', args, {
    timeout: (config.tests?.timeout ?? 30_000) * 10,
    throwOnError: false,
  })

  const output = result.stdout + result.stderr
  const passMatch = output.match(/(\d+) passed/)
  const failMatch = output.match(/(\d+) failed/)

  return {
    exitCode: result.exitCode ?? 0,
    passed: passMatch ? Number(passMatch[1]) : 0,
    failed: failMatch ? Number(failMatch[1]) : 0,
    output,
  }
}

export async function replayAll(opts: Omit<ReplayOptions, 'name'>): Promise<ReplayResult> {
  const config = await loadProbeConfig()
  const testsDir = config.tests?.dir ?? 'tests/qprobe'
  const recordingsDir = join(testsDir, 'recordings')

  await ensurePlaywrightConfig(testsDir, opts)

  const args = ['playwright', 'test', recordingsDir, '--grep', '\\.spec\\.ts$']

  if (opts.headed) args.push('--headed')
  if (opts.browser) args.push('--project', opts.browser)
  if (opts.parallel) args.push('--workers', '4')
  if (opts.retries) args.push('--retries', String(opts.retries))
  if (opts.report) args.push('--reporter', 'html')

  const result = await x('npx', args, {
    timeout: (config.tests?.timeout ?? 30_000) * 20,
    throwOnError: false,
  })

  const output = result.stdout + result.stderr
  const passMatch = output.match(/(\d+) passed/)
  const failMatch = output.match(/(\d+) failed/)

  return {
    exitCode: result.exitCode ?? 0,
    passed: passMatch ? Number(passMatch[1]) : 0,
    failed: failMatch ? Number(failMatch[1]) : 0,
    output,
  }
}

async function ensurePlaywrightConfig(
  testsDir: string,
  opts: Partial<ReplayOptions>,
): Promise<void> {
  const config = await loadProbeConfig()
  const baseUrl = opts.base ?? config.browser?.baseUrl ?? config.http?.baseUrl ?? 'http://localhost:3000'

  const content = `import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './recordings',
  timeout: ${config.tests?.timeout ?? 30_000},
  use: {
    baseURL: '${baseUrl}',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
})
`
  await mkdir(testsDir, { recursive: true })
  await writeFile(join(testsDir, 'playwright.config.ts'), content, 'utf-8')
}
