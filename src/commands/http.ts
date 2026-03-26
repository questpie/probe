import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { ConfigError, loadProbeConfig } from '../core/config'
import { makeRequest } from '../core/http-client'
import { error, info, log, success } from '../utils/output'

const command = defineCommand({
  meta: {
    name: 'http',
    description: 'Send HTTP requests against a running server',
  },
  args: {
    method: {
      type: 'positional',
      description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
      required: true,
    },
    path: {
      type: 'positional',
      description: 'URL path (e.g. /api/users)',
      required: true,
    },
    data: {
      type: 'string',
      alias: 'd',
      description: 'Request body (JSON)',
    },
    header: {
      type: 'string',
      alias: 'H',
      description: 'Header as key:value',
    },
    token: {
      type: 'string',
      description: 'Bearer token',
    },
    status: {
      type: 'string',
      description: 'Assert expected status code',
    },
    jq: {
      type: 'string',
      description: 'JQ-style filter on response',
    },
    raw: {
      type: 'boolean',
      description: 'Raw output (no pretty-print)',
      default: false,
    },
    verbose: {
      type: 'boolean',
      alias: 'v',
      description: 'Show request and response headers',
      default: false,
    },
    base: {
      type: 'string',
      description: 'Base URL override',
    },
    timing: {
      type: 'boolean',
      description: 'Show request timing breakdown',
      default: false,
    },
    retries: {
      type: 'string',
      description: 'Max retries on 429/503 (default: 3)',
    },
  },
  async run({ args }) {
    const config = await loadProbeConfig()

    const headers: Record<string, string> = {}
    if (args.header) {
      const parts = args.header.split(',')
      for (const part of parts) {
        const idx = part.indexOf(':')
        if (idx > 0) {
          headers[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
        }
      }
    }

    try {
      if (args.verbose) {
        const base = args.base ?? config.http?.baseUrl ?? 'http://localhost:3000'
        const url = args.path.startsWith('http') ? args.path : `${base}${args.path}`
        log(`\u2192 ${args.method} ${url}`)
        for (const [k, v] of Object.entries(headers)) {
          log(`\u2192 ${k}: ${v}`)
        }
        if (args.data) {
          log(`\u2192 Body: ${args.data}`)
        }
      }

      const result = await makeRequest(
        {
          method: args.method,
          path: args.path,
          base: args.base,
          data: args.data,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          token: args.token,
          verbose: args.verbose,
          raw: args.raw,
          retries: args.retries ? Number(args.retries) : undefined,
        },
        config,
      )

      if (result.retried) {
        info(`Request succeeded after ${result.retried} retry(s)`)
      }

      if (args.verbose) {
        log(`\u2190 ${result.status} ${result.statusText} (${result.duration}ms)`)
        for (const [k, v] of Object.entries(result.headers)) {
          log(`\u2190 ${k}: ${v}`)
        }
      }

      if (args.timing) {
        info(`Total: ${result.duration}ms`)
      }

      if (args.status) {
        const expected = Number(args.status)
        if (result.status !== expected) {
          error(
            `Expected ${expected}, got ${result.status} ${result.statusText} (${result.duration}ms)`,
          )
          if (result.body) {
            info('Response body:')
            log(args.raw ? String(result.body) : JSON.stringify(result.body, null, 2))
          }
          process.exit(1)
        }
        success(`${result.status} ${result.statusText} (${result.duration}ms)`)
        return
      }

      if (!args.verbose) {
        info(`${result.status} ${result.statusText} (${result.duration}ms)`)
      }

      if (result.body !== undefined && result.body !== null) {
        let output: unknown = result.body
        if (args.jq) {
          output = applyJqFilter(result.body, args.jq)
        }
        if (args.raw) {
          log(typeof output === 'string' ? output : JSON.stringify(output))
        } else {
          log(JSON.stringify(output, null, 2))
        }
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err))
      process.exit(err instanceof ConfigError ? 4 : 1)
    }
  },
})
export default command as CommandDef

function applyJqFilter(data: unknown, expr: string): unknown {
  const parts = expr.split('.').filter(Boolean)
  let current: unknown = data

  for (const part of parts) {
    const arrayMatch = part.match(/^\[(\d+)]$/)
    if (arrayMatch && Array.isArray(current)) {
      current = current[Number(arrayMatch[1])]
    } else if (current && typeof current === 'object' && !Array.isArray(current)) {
      const bracketMatch = part.match(/^(.+?)\[(\d+)]$/)
      if (bracketMatch) {
        const obj = current as Record<string, unknown>
        const arr = obj[bracketMatch[1]!]
        if (Array.isArray(arr)) {
          current = arr[Number(bracketMatch[2])]
        } else {
          current = undefined
        }
      } else {
        current = (current as Record<string, unknown>)[part]
      }
    } else if (Array.isArray(current)) {
      current = current.map((item) => {
        if (item && typeof item === 'object') {
          return (item as Record<string, unknown>)[part]
        }
        return undefined
      })
    } else {
      current = undefined
    }
  }
  return current
}
