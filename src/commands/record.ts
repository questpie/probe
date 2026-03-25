import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { cancelRecording, getActiveRecording, startRecording, stopRecording } from '../testing/recorder'
import { generatePlaywrightTest } from '../testing/codegen'
import { loadProbeConfig } from '../core/config'
import { error, info, success } from '../utils/output'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const start = defineCommand({
  meta: { name: 'start', description: 'Start recording browser actions' },
  args: {
    name: { type: 'positional', description: 'Recording name', required: true },
  },
  async run({ args }) {
    try {
      await startRecording(args.name)
      success(`Recording "${args.name}" started`)
      info('Browser and HTTP commands will be recorded. Run "qprobe record stop" when done.')
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  },
}) as CommandDef

const stop = defineCommand({
  meta: { name: 'stop', description: 'Stop recording and generate Playwright test' },
  args: {},
  async run() {
    try {
      const recording = await stopRecording()
      const specCode = generatePlaywrightTest(recording)

      const config = await loadProbeConfig()
      const testsDir = config.tests?.dir ?? 'tests/qprobe'
      const recordingsDir = join(testsDir, 'recordings')
      await mkdir(recordingsDir, { recursive: true })

      const specPath = join(recordingsDir, `${recording.name}.spec.ts`)
      await writeFile(specPath, specCode, 'utf-8')

      success(`Recording "${recording.name}" saved (${recording.actions.length} actions)`)
      info(`JSON: ${join(recordingsDir, `${recording.name}.json`)}`)
      info(`Spec: ${specPath}`)
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  },
}) as CommandDef

const cancel = defineCommand({
  meta: { name: 'cancel', description: 'Cancel recording without saving' },
  args: {},
  async run() {
    const active = await getActiveRecording()
    if (!active) {
      info('No active recording')
      return
    }
    await cancelRecording()
    success(`Recording "${active.name}" cancelled`)
  },
}) as CommandDef

const command = defineCommand({
  meta: {
    name: 'record',
    description: 'Record browser actions for replay',
  },
  subCommands: { start, stop, cancel },
})
export default command as CommandDef
