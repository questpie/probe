import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { listProcesses } from '../core/process-manager'
import { info, json as jsonOut, table } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'ps',
    description: 'List running processes',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'JSON output',
      default: false,
    },
  },
  async run({ args }) {
    const processes = await listProcesses()

    if (processes.length === 0) {
      info('No processes running')
      return
    }

    if (args.json) {
      jsonOut(processes)
      return
    }

    table(
      processes.map((p) => ({
        name: p.name,
        pid: p.pid,
        port: p.port ?? '\u2014',
        status: p.status,
        uptime: p.uptime,
      })),
    )
  },
})
export default command as CommandDef
