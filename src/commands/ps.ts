import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { type ProcessInfo, listProcesses } from '../core/process-manager'
import { type ProcessRecord, listProcessesAcrossSessions } from '../core/registry'
import { getSessionId } from '../core/session'
import { info, json as jsonOut, table } from '../utils/output'

/**
 * Build table rows for `ps`. Pure: takes the resolved process records plus the
 * `all` flag and returns rows ready for `table()`. When `all` is set, a
 * `session` column is included (cross-session view) using each record's
 * `session`; otherwise it is omitted. A missing port renders as an em dash.
 */
export function buildPsRows(processes: ProcessInfo[], all: boolean): Record<string, unknown>[] {
  return processes.map((p) => {
    const base: Record<string, unknown> = {
      name: p.name,
      pid: p.pid,
      port: p.port ?? '—',
      status: p.status,
      uptime: p.uptime,
    }
    if (all) base.session = (p as ProcessRecord).session
    return base
  })
}

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
    all: {
      type: 'boolean',
      description: 'List processes across all sessions and the shared scope',
      default: false,
    },
  },
  async run({ args }) {
    if (args.all) {
      const processes = await listProcessesAcrossSessions()

      if (processes.length === 0) {
        info('No processes running')
        return
      }

      if (args.json) {
        jsonOut(processes)
        return
      }

      table(buildPsRows(processes, true))
      return
    }

    const sessionId = getSessionId()
    const processes = await listProcesses()

    if (processes.length === 0) {
      info(`No processes running in session ${sessionId}`)
      return
    }

    if (args.json) {
      jsonOut(processes)
      return
    }

    info(`Session: ${sessionId}`)
    // listProcesses() returns the current session's processes; render without
    // the session column (all=false never reads `.session`).
    table(buildPsRows(processes, false))
  },
})
export default command as CommandDef
