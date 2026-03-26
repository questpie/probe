import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { makeRequest } from '../../src/core/http-client'
import type { ProbeConfig } from '../../src/core/config'

let server: Server
let PORT: number

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/ok') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Custom': 'test' })
      res.end(JSON.stringify({ hello: 'world' }))
      return
    }
    if (req.url === '/echo' && req.method === 'POST') {
      let body = ''
      req.on('data', (c: Buffer) => {
        body += c.toString()
      })
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
      })
      return
    }
    if (req.url === '/auth') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ auth: req.headers.authorization }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  PORT = await new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      resolve(typeof addr === 'object' && addr ? addr.port : 0)
    })
  })
})

afterAll(() => {
  server.close()
})

const config: ProbeConfig = {}

describe('makeRequest', () => {
  test('GET returns status, body, headers, duration', async () => {
    const result = await makeRequest(
      { method: 'GET', path: `http://127.0.0.1:${PORT}/ok` },
      config,
    )
    expect(result.status).toBe(200)
    expect(result.statusText).toBe('OK')
    expect(result.body).toEqual({ hello: 'world' })
    expect(result.headers['x-custom']).toBe('test')
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  test('POST sends body', async () => {
    const result = await makeRequest(
      { method: 'POST', path: `http://127.0.0.1:${PORT}/echo`, data: '{"foo":"bar"}' },
      config,
    )
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ foo: 'bar' })
  })

  test('bearer token sets Authorization header', async () => {
    const result = await makeRequest(
      { method: 'GET', path: `http://127.0.0.1:${PORT}/auth`, token: 'mytoken123' },
      config,
    )
    expect(result.body).toEqual({ auth: 'Bearer mytoken123' })
  })

  test('resolves path from config baseUrl', async () => {
    const cfgWithBase: ProbeConfig = { http: { baseUrl: `http://127.0.0.1:${PORT}` } }
    const result = await makeRequest({ method: 'GET', path: '/ok' }, cfgWithBase)
    expect(result.status).toBe(200)
  })

  test('base option overrides config', async () => {
    const result = await makeRequest(
      { method: 'GET', path: '/ok', base: `http://127.0.0.1:${PORT}` },
      config,
    )
    expect(result.status).toBe(200)
  })

  test('404 is returned (not thrown) due to ignoreResponseError', async () => {
    const result = await makeRequest(
      { method: 'GET', path: `http://127.0.0.1:${PORT}/nope` },
      config,
    )
    expect(result.status).toBe(404)
  })

  test('custom headers are sent', async () => {
    const result = await makeRequest(
      {
        method: 'GET',
        path: `http://127.0.0.1:${PORT}/auth`,
        headers: { Authorization: 'Custom xyz' },
      },
      config,
    )
    expect(result.body).toEqual({ auth: 'Custom xyz' })
  })

  test('config headers are merged', async () => {
    const cfgWithHeaders: ProbeConfig = {
      http: {
        baseUrl: `http://127.0.0.1:${PORT}`,
        headers: { Authorization: 'FromConfig abc' },
      },
    }
    const result = await makeRequest({ method: 'GET', path: '/auth' }, cfgWithHeaders)
    expect(result.body).toEqual({ auth: 'FromConfig abc' })
  })

  test('request headers override config headers', async () => {
    const cfgWithHeaders: ProbeConfig = {
      http: {
        baseUrl: `http://127.0.0.1:${PORT}`,
        headers: { Authorization: 'FromConfig old' },
      },
    }
    const result = await makeRequest(
      { method: 'GET', path: '/auth', headers: { Authorization: 'Override new' } },
      cfgWithHeaders,
    )
    expect(result.body).toEqual({ auth: 'Override new' })
  })

  test('retries on 429 with exponential backoff', async () => {
    let attempts = 0
    const retryServer = createServer((req, res) => {
      attempts++
      if (attempts < 3) {
        res.writeHead(429, { 'Retry-After': '0' })
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })

    const retryPort = await new Promise<number>((resolve) => {
      retryServer.listen(0, '127.0.0.1', () => {
        const addr = retryServer.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 0)
      })
    })

    try {
      const result = await makeRequest(
        { method: 'GET', path: `http://127.0.0.1:${retryPort}/`, retries: 3 },
        config,
      )
      expect(result.status).toBe(200)
      expect(result.body).toEqual({ ok: true })
      expect(result.retried).toBe(2)
      expect(attempts).toBe(3)
    } finally {
      retryServer.close()
    }
  })

  test('retries on 503 service unavailable', async () => {
    let attempts = 0
    const retryServer = createServer((req, res) => {
      attempts++
      if (attempts < 2) {
        res.writeHead(503)
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ recovered: true }))
    })

    const retryPort = await new Promise<number>((resolve) => {
      retryServer.listen(0, '127.0.0.1', () => {
        const addr = retryServer.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 0)
      })
    })

    try {
      const result = await makeRequest(
        { method: 'GET', path: `http://127.0.0.1:${retryPort}/`, retries: 3 },
        config,
      )
      expect(result.status).toBe(200)
      expect(result.retried).toBe(1)
    } finally {
      retryServer.close()
    }
  })

  test('returns 429 when retries exhausted', async () => {
    const retryServer = createServer((req, res) => {
      res.writeHead(429, { 'Retry-After': '0' })
      res.end()
    })

    const retryPort = await new Promise<number>((resolve) => {
      retryServer.listen(0, '127.0.0.1', () => {
        const addr = retryServer.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 0)
      })
    })

    try {
      const result = await makeRequest(
        { method: 'GET', path: `http://127.0.0.1:${retryPort}/`, retries: 1 },
        config,
      )
      expect(result.status).toBe(429)
    } finally {
      retryServer.close()
    }
  })

  test('no retry on non-retryable status', async () => {
    let attempts = 0
    const retryServer = createServer((req, res) => {
      attempts++
      res.writeHead(500)
      res.end()
    })

    const retryPort = await new Promise<number>((resolve) => {
      retryServer.listen(0, '127.0.0.1', () => {
        const addr = retryServer.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 0)
      })
    })

    try {
      const result = await makeRequest(
        { method: 'GET', path: `http://127.0.0.1:${retryPort}/`, retries: 3 },
        config,
      )
      expect(result.status).toBe(500)
      expect(attempts).toBe(1)
      expect(result.retried).toBeUndefined()
    } finally {
      retryServer.close()
    }
  })
})
