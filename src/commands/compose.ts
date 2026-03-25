import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { loadProbeConfig } from '../core/config'
import { composeDown, composeUp } from '../core/compose-engine'
import { listProcesses } from '../core/process-manager'
import { error, info, json as jsonOut, success, table } from '../utils/output'

const up = defineCommand({
  meta: { name: 'up', description: 'Start all services from config' },
  args: {
    only: { type: 'string', description: 'Only start these services (comma-separated)' },
    skip: { type: 'string', description: 'Skip these services (comma-separated)' },
    'no-health': { type: 'boolean', description: 'Skip health checks', default: false },
  },
  async run({ args }) {
    const config = await loadProbeConfig()
    if (!config.services || Object.keys(config.services).length === 0) {
      error('No services defined in config')
      process.exit(4)
    }

    try {
      const started = await composeUp(config.services, {
        only: args.only ? args.only.split(',') : undefined,
        skip: args.skip ? args.skip.split(',') : undefined,
        noHealth: args['no-health'],
      })
      success(`Started ${started.length} service(s): ${started.join(', ')}`)
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  },
}) as CommandDef

const down = defineCommand({
  meta: { name: 'down', description: 'Stop all services' },
  args: {},
  async run() {
    const config = await loadProbeConfig()
    if (!config.services) {
      info('No services defined')
      return
    }
    const stopped = await composeDown(config.services)
    if (stopped.length === 0) {
      info('No services were running')
    } else {
      success(`Stopped ${stopped.length} service(s): ${stopped.join(', ')}`)
    }
  },
}) as CommandDef

const restart = defineCommand({
  meta: { name: 'restart', description: 'Restart a service or all services' },
  args: {
    name: { type: 'positional', description: 'Service name (optional)', required: false },
  },
  async run({ args }) {
    const config = await loadProbeConfig()
    if (!config.services) {
      error('No services defined')
      process.exit(4)
    }

    try {
      if (args.name) {
        const svc = config.services[args.name]
        if (!svc) {
          error(`Unknown service: "${args.name}"`)
          process.exit(1)
        }
        const { stopProcess, startProcess } = await import('../core/process-manager')
        try {
          await stopProcess(args.name)
        } catch {
          // may not be running
        }
        await startProcess({
          name: args.name,
          cmd: svc.cmd,
          ready: svc.ready,
          port: svc.port,
          env: svc.env,
          cwd: svc.cwd,
        })
        success(`Restarted "${args.name}"`)
      } else {
        await composeDown(config.services)
        const started = await composeUp(config.services, {})
        success(`Restarted ${started.length} service(s)`)
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  },
}) as CommandDef

const status = defineCommand({
  meta: { name: 'status', description: 'Show status of all services' },
  args: {
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    const processes = await listProcesses()
    if (args.json) {
      jsonOut(processes)
      return
    }
    if (processes.length === 0) {
      info('No services running')
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
}) as CommandDef

const command = defineCommand({
  meta: {
    name: 'compose',
    description: 'Manage service stack from config',
  },
  subCommands: { up, down, restart, status },
})
export default command as CommandDef
