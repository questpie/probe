import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { followLogs, readAllLogs, readLogs } from '../core/log-reader'
import type { LogFilter } from '../core/log-reader'
import { parseDuration } from '../utils/duration'
import { error, info, json as jsonOut, log } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'logs',
    description: 'Read process logs with filtering',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Process name',
      required: false,
    },
    follow: {
      type: 'boolean',
      alias: 'f',
      description: 'Follow mode (tail -f)',
      default: false,
    },
    lines: {
      type: 'string',
      alias: 'n',
      description: 'Number of lines',
      default: '50',
    },
    grep: {
      type: 'string',
      description: 'Filter pattern (regex)',
    },
    level: {
      type: 'string',
      description: 'Log level filter (error, warn, info, debug)',
    },
    since: {
      type: 'string',
      description: 'Time filter (e.g. 5m, 1h)',
    },
    all: {
      type: 'boolean',
      description: 'All processes merged',
      default: false,
    },
    unified: {
      type: 'boolean',
      description: 'All processes + browser unified',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'JSON output',
      default: false,
    },
  },
  async run({ args }) {
    const filter: LogFilter = {
      grep: args.grep,
      level: args.level,
      lines: Number(args.lines),
      since: args.since ? parseDuration(args.since) : undefined,
      json: args.json,
    }

    if (args.all || args.unified) {
      const entries = await readAllLogs(filter)
      if (entries.length === 0) {
        info('No log entries found')
        return
      }
      if (args.json) {
        jsonOut(entries)
      } else {
        for (const entry of entries) {
          log(`[${entry.source}] ${entry.timestamp} ${entry.level} ${entry.message}`)
        }
      }
      return
    }

    if (!args.name) {
      error('Provide a process name, or use --all')
      process.exit(1)
    }

    if (args.follow) {
      const ac = new AbortController()
      process.on('SIGINT', () => ac.abort())
      await followLogs(args.name, filter, ac.signal)
      return
    }

    const entries = await readLogs(args.name, filter)
    if (entries.length === 0) {
      info(`No log entries for "${args.name}"`)
      return
    }

    if (args.json) {
      jsonOut(entries)
    } else {
      for (const entry of entries) {
        log(`${entry.timestamp} ${entry.level} ${entry.message}`)
      }
    }
  },
})
export default command as CommandDef
