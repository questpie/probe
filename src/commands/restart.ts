import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { getProcessState, startProcess, stopProcess } from '../core/process-manager'
import { error, success } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'restart',
    description: 'Restart a process with its original config',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Process name to restart',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const state = await getProcessState(args.name)
      if (!state) {
        error(`No saved state for "${args.name}"`)
        process.exit(1)
      }

      await stopProcess(args.name)

      const { pid } = await startProcess({
        name: state.name,
        cmd: state.cmd,
        ready: state.ready,
        timeout: state.timeout,
        port: state.port,
        env: state.env,
        cwd: state.cwd,
      })

      success(`Restarted "${args.name}" (PID ${pid})`)
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  },
})
export default command as CommandDef
