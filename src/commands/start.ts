import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { startProcess } from '../core/process-manager'
import { parseDuration } from '../utils/duration'
import { error, success } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'start',
    description: 'Start a background process with ready detection',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Process name',
      required: true,
    },
    cmd: {
      type: 'positional',
      description: 'Command to run',
      required: true,
    },
    ready: {
      type: 'string',
      description: 'Ready pattern (regex/string in stdout)',
    },
    timeout: {
      type: 'string',
      description: 'Max wait for ready (e.g. 60s, 5m)',
      default: '60s',
    },
    port: {
      type: 'string',
      description: 'Port for health checks',
    },
    env: {
      type: 'string',
      description:
        'Environment variables as comma-separated KEY=VAL pairs (e.g. "PORT=3000,DB_URL=postgres://...")',
    },
    cwd: {
      type: 'string',
      description: 'Working directory',
    },
  },
  async run({ args }) {
    const envVars: Record<string, string> = {}
    if (args.env) {
      // Split on commas that are followed by a KEY= pattern (word chars + '=')
      // This avoids splitting commas inside values like URLs
      const pairs = args.env.split(/,(?=[A-Za-z_][A-Za-z0-9_]*=)/)
      for (const pair of pairs) {
        const eqIndex = pair.indexOf('=')
        if (eqIndex > 0) {
          const key = pair.slice(0, eqIndex)
          const value = pair.slice(eqIndex + 1)
          envVars[key] = value
        }
      }
    }

    try {
      const { pid } = await startProcess({
        name: args.name,
        cmd: args.cmd,
        ready: args.ready,
        timeout: parseDuration(args.timeout),
        port: args.port ? Number(args.port) : undefined,
        env: Object.keys(envVars).length > 0 ? envVars : undefined,
        cwd: args.cwd,
      })

      success(`Started "${args.name}" (PID ${pid})`)
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(err instanceof Error && err.message.includes('Timeout') ? 2 : 1)
    }
  },
})
export default command as CommandDef
