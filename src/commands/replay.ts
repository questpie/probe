import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { replayAll, replayRecording } from '../testing/replayer'
import { formatReplayResult } from '../testing/reporter'
import { error, log } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'replay',
    description: 'Run recorded Playwright tests',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Recording name to replay',
      required: false,
    },
    all: {
      type: 'boolean',
      description: 'Replay all recordings',
      default: false,
    },
    headed: {
      type: 'boolean',
      description: 'Show browser window',
      default: false,
    },
    browser: {
      type: 'string',
      description: 'Browser to use (chromium, firefox, webkit)',
    },
    parallel: {
      type: 'boolean',
      description: 'Run tests in parallel',
      default: false,
    },
    report: {
      type: 'boolean',
      description: 'Generate HTML report',
      default: false,
    },
    retries: {
      type: 'string',
      description: 'Number of retries for flaky tests',
    },
    base: {
      type: 'string',
      description: 'Override base URL',
    },
  },
  async run({ args }) {
    try {
      const opts = {
        headed: args.headed,
        browser: args.browser,
        parallel: args.parallel,
        report: args.report,
        retries: args.retries ? Number(args.retries) : undefined,
        base: args.base,
      }

      let result
      if (args.all) {
        result = await replayAll(opts)
      } else if (args.name) {
        result = await replayRecording({ name: args.name, ...opts })
      } else {
        error('Provide a recording name or use --all')
        process.exit(1)
      }

      log(formatReplayResult(result))
      if (result.exitCode !== 0) process.exit(6)
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  },
})
export default command as CommandDef
