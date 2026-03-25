import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadProbeConfig } from '../core/config'
import { generatePlaywrightTest } from '../testing/codegen'
import type { Recording } from '../testing/recorder'
import { formatRecordingsList } from '../testing/reporter'
import { error, info, json as jsonOut, log, success } from '../utils/output'

async function getRecordingsDir(): Promise<string> {
  const config = await loadProbeConfig()
  return join(config.tests?.dir ?? 'tests/qprobe', 'recordings')
}

async function loadRecording(name: string): Promise<Recording> {
  const dir = await getRecordingsDir()
  const content = await readFile(join(dir, `${name}.json`), 'utf-8')
  return JSON.parse(content) as Recording
}

const list = defineCommand({
  meta: { name: 'list', description: 'List all recordings' },
  args: {
    json: { type: 'boolean', description: 'JSON output', default: false },
  },
  async run({ args }) {
    const dir = await getRecordingsDir()
    let files: string[]
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith('.json'))
    } catch {
      info('No recordings found')
      return
    }

    const recordings = []
    for (const file of files) {
      try {
        const content = await readFile(join(dir, file), 'utf-8')
        const rec = JSON.parse(content) as Recording
        recordings.push({
          name: rec.name,
          actions: rec.actions.length,
          date: rec.startedAt.split('T')[0] ?? '',
        })
      } catch {
        // skip corrupt files
      }
    }

    if (args.json) {
      jsonOut(recordings)
    } else {
      log(formatRecordingsList(recordings))
    }
  },
}) as CommandDef

const show = defineCommand({
  meta: { name: 'show', description: 'Show recording details' },
  args: {
    name: { type: 'positional', description: 'Recording name', required: true },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const rec = await loadRecording(args.name)
      if (args.json) {
        jsonOut(rec)
      } else {
        info(`Recording: ${rec.name}`)
        info(`Started: ${rec.startedAt}`)
        if (rec.finishedAt) info(`Finished: ${rec.finishedAt}`)
        info(`Actions: ${rec.actions.length}`)
        log('')
        for (const action of rec.actions) {
          log(`  ${action.command} ${action.args.join(' ')}`)
        }
      }
    } catch {
      error(`Recording "${args.name}" not found`)
      process.exit(1)
    }
  },
}) as CommandDef

const deleteCmd = defineCommand({
  meta: { name: 'delete', description: 'Delete a recording' },
  args: {
    name: { type: 'positional', description: 'Recording name', required: true },
  },
  async run({ args }) {
    const dir = await getRecordingsDir()
    try {
      await rm(join(dir, `${args.name}.json`))
    } catch {
      // ignore
    }
    try {
      await rm(join(dir, `${args.name}.spec.ts`))
    } catch {
      // ignore
    }
    success(`Deleted recording "${args.name}"`)
  },
}) as CommandDef

const exportCmd = defineCommand({
  meta: { name: 'export', description: 'Export as standalone Playwright project' },
  args: {
    name: { type: 'positional', description: 'Recording name', required: true },
  },
  async run({ args }) {
    try {
      const rec = await loadRecording(args.name)
      const specCode = generatePlaywrightTest(rec)

      const exportDir = `${args.name}-playwright`
      await mkdir(exportDir, { recursive: true })

      await writeFile(join(exportDir, `${args.name}.spec.ts`), specCode, 'utf-8')
      await writeFile(
        join(exportDir, 'package.json'),
        JSON.stringify(
          {
            name: `${args.name}-tests`,
            scripts: { test: 'playwright test' },
            devDependencies: { '@playwright/test': '>=1.45.0' },
          },
          null,
          2,
        ),
        'utf-8',
      )
      await writeFile(
        join(exportDir, 'playwright.config.ts'),
        `import { defineConfig } from '@playwright/test'
export default defineConfig({
  use: { baseURL: '${rec.baseUrl ?? 'http://localhost:3000'}' },
})
`,
        'utf-8',
      )

      success(`Exported to ./${exportDir}/`)
      info('Run: cd ' + exportDir + ' && bun install && bunx playwright test')
    } catch {
      error(`Recording "${args.name}" not found`)
      process.exit(1)
    }
  },
}) as CommandDef

const command = defineCommand({
  meta: {
    name: 'recordings',
    description: 'Manage test recordings',
  },
  subCommands: {
    list,
    show,
    delete: deleteCmd,
    export: exportCmd,
  },
})
export default command as CommandDef
