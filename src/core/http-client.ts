import { consola } from 'consola'
import { ofetch } from 'ofetch'
import type { ProbeConfig } from './config'
import { resolveBaseUrl } from './config'

export interface RequestOptions {
  method: string
  path: string
  base?: string
  data?: string
  headers?: Record<string, string>
  token?: string
  verbose?: boolean
  raw?: boolean
  retries?: number
}

export interface RequestResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: unknown
  duration: number
  retried?: number
}

const MAX_RETRY_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1_000

export async function makeRequest(
  opts: RequestOptions,
  config: ProbeConfig,
): Promise<RequestResult> {
  const base = opts.base ?? resolveBaseUrl(config)
  const url = opts.path.startsWith('http') ? opts.path : `${base}${opts.path}`

  const headers: Record<string, string> = {
    ...config.http?.headers,
    ...opts.headers,
  }

  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`
  }

  let body: Record<string, unknown> | undefined
  if (opts.data) {
    body = JSON.parse(opts.data) as Record<string, unknown>
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  const maxRetries = opts.retries ?? MAX_RETRY_ATTEMPTS
  let lastResponse: Awaited<ReturnType<typeof ofetch.raw>> | undefined
  let retried = 0
  const totalStart = performance.now()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = performance.now()

    const response = await ofetch.raw(url, {
      method: opts.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      headers,
      body,
      ignoreResponseError: true,
    })

    lastResponse = response

    // Auto-retry on 429 (Too Many Requests) and 503 (Service Unavailable)
    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const retryAfter = response.headers.get('retry-after')
      let delayMs: number

      if (retryAfter) {
        // Retry-After can be seconds or a date
        const parsed = Number(retryAfter)
        delayMs = Number.isNaN(parsed)
          ? Math.max(0, new Date(retryAfter).getTime() - Date.now())
          : parsed * 1_000
      } else {
        // Exponential backoff: 1s, 2s, 4s
        delayMs = RETRY_BASE_DELAY_MS * 2 ** attempt
      }

      consola.warn(
        `Got ${response.status} — retrying in ${Math.round(delayMs / 1_000)}s (attempt ${attempt + 1}/${maxRetries})`,
      )
      await new Promise((r) => setTimeout(r, delayMs))
      retried++
      continue
    }

    // Success or non-retryable error
    break
  }

  if (!lastResponse) throw new Error('No response received')

  const duration = Math.round(performance.now() - totalStart)

  const responseHeaders: Record<string, string> = {}
  lastResponse.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  return {
    status: lastResponse.status,
    statusText: lastResponse.statusText,
    headers: responseHeaders,
    body: lastResponse._data,
    duration,
    ...(retried > 0 ? { retried } : {}),
  }
}
