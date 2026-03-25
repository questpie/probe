import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { ofetch } from 'ofetch'
import { parseDuration } from '../utils/duration'
import { error, success } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'health',
    description: 'Poll a URL until it responds with expected status',
  },
  args: {
    url: {
      type: 'positional',
      description: 'URL to check',
      required: true,
    },
    interval: {
      type: 'string',
      description: 'Interval between attempts',
      default: '1s',
    },
    timeout: {
      type: 'string',
      description: 'Max total wait time',
      default: '30s',
    },
    status: {
      type: 'string',
      description: 'Expected status code',
      default: '200',
    },
  },
  async run({ args }) {
    const intervalMs = parseDuration(args.interval)
    const timeoutMs = parseDuration(args.timeout)
    const expectedStatus = Number(args.status)
    const startTime = Date.now()
    const deadline = startTime + timeoutMs

    while (Date.now() < deadline) {
      try {
        const reqStart = performance.now()
        const response = await ofetch.raw(args.url, { ignoreResponseError: true })
        const duration = Math.round(performance.now() - reqStart)

        if (response.status === expectedStatus) {
          const elapsed = ((Date.now() - startTime) / 1_000).toFixed(1)
          success(
            `${args.url} responding (${response.status} ${response.statusText}, ${duration}ms) after ${elapsed}s`,
          )
          return
        }
      } catch {
        // connection refused, retry
      }

      if (Date.now() + intervalMs > deadline) break
      await new Promise((r) => setTimeout(r, intervalMs))
    }

    const elapsed = ((Date.now() - startTime) / 1_000).toFixed(1)
    error(`${args.url} did not respond with ${expectedStatus} within ${elapsed}s`)
    process.exit(3)
  },
})
export default command as CommandDef
