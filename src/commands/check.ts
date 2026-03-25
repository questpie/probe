import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { ofetch } from 'ofetch'
import { ConfigError, loadProbeConfig, resolveBaseUrl } from '../core/config'
import { listProcesses } from '../core/process-manager'
import { error, info, success, warn } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'check',
    description: 'Quick health check of a running application',
  },
  args: {
    url: {
      type: 'positional',
      description: 'URL to check (defaults to baseUrl from config)',
      required: false,
    },
  },
  async run({ args }) {
    const config = await loadProbeConfig()
    const url = args.url ?? resolveBaseUrl(config)

    info(`Checking ${url}...`)

    try {
      const start = performance.now()
      const response = await ofetch.raw(url, { ignoreResponseError: true })
      const duration = Math.round(performance.now() - start)

      if (response.status >= 200 && response.status < 400) {
        success(`HTTP ${response.status} ${response.statusText} (${duration}ms)`)
      } else {
        error(`HTTP ${response.status} ${response.statusText} (${duration}ms)`)
      }
    } catch (err) {
      error(`Connection failed: ${err instanceof Error ? err.message : String(err)}`)
    }

    const processes = await listProcesses()
    if (processes.length > 0) {
      info(`${processes.length} service(s) running (${processes.map((p) => p.name).join(', ')})`)
    } else {
      warn('No managed services running')
    }
  },
})
export default command as CommandDef
