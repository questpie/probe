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
}

export interface RequestResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: unknown
  duration: number
}

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
    headers['Authorization'] = `Bearer ${opts.token}`
  }

  let body: Record<string, unknown> | undefined
  if (opts.data) {
    body = JSON.parse(opts.data) as Record<string, unknown>
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  const start = performance.now()

  const response = await ofetch.raw(url, {
    method: opts.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    headers,
    body,
    ignoreResponseError: true,
  })

  const duration = Math.round(performance.now() - start)

  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: response._data,
    duration,
  }
}
