import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { stopAll, stopProcess } from '../core/process-manager'
import { error, success } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'stop',
    description: 'Stop a running process (SIGTERM → SIGKILL)',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Process name to stop',
      required: false,
    },
    all: {
      type: 'boolean',
      description: 'Stop all processes',
      default: false,
    },
  },
  async run({ args }) {
    try {
      if (args.all) {
        const stopped = await stopAll()
        if (stopped.length === 0) {
          success('No processes running')
        } else {
          success(`Stopped ${stopped.length} process(es): ${stopped.join(', ')}`)
        }
        return
      }

      if (!args.name) {
        error('Provide a process name or use --all')
        process.exit(1)
      }

      await stopProcess(args.name)
      success(`Stopped "${args.name}"`)
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  },
})
export default command as CommandDef
