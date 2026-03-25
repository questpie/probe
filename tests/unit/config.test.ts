import { afterEach, describe, expect, test } from 'bun:test'
import { defineConfig, resolveBaseUrl } from '../../src/core/config'
import type { ProbeConfig } from '../../src/core/config'

describe('defineConfig', () => {
  test('passes through config', () => {
    const input: ProbeConfig = {
      services: {
        api: { cmd: 'bun dev', port: 3000 },
      },
    }
    expect(defineConfig(input)).toBe(input)
  })
})

describe('resolveBaseUrl', () => {
  test('uses http.baseUrl first', () => {
    const config: ProbeConfig = {
      http: { baseUrl: 'http://example.com' },
      browser: { baseUrl: 'http://browser.com' },
    }
    expect(resolveBaseUrl(config)).toBe('http://example.com')
  })

  test('falls back to browser.baseUrl', () => {
    const config: ProbeConfig = {
      browser: { baseUrl: 'http://browser.com' },
    }
    expect(resolveBaseUrl(config)).toBe('http://browser.com')
  })

  test('falls back to first service with port', () => {
    const config: ProbeConfig = {
      services: {
        db: { cmd: 'docker up' },
        api: { cmd: 'bun dev', port: 8080 },
      },
    }
    expect(resolveBaseUrl(config)).toBe('http://localhost:8080')
  })

  test('falls back to localhost:3000', () => {
    const config: ProbeConfig = {}
    expect(resolveBaseUrl(config)).toBe('http://localhost:3000')
  })

  test('empty services still falls back', () => {
    const config: ProbeConfig = { services: {} }
    expect(resolveBaseUrl(config)).toBe('http://localhost:3000')
  })

  test('QPROBE_BASE_URL env overrides everything', () => {
    const prev = process.env.QPROBE_BASE_URL
    process.env.QPROBE_BASE_URL = 'http://from-env:9999'
    try {
      const config: ProbeConfig = { http: { baseUrl: 'http://config.com' } }
      expect(resolveBaseUrl(config)).toBe('http://from-env:9999')
    } finally {
      if (prev === undefined) delete process.env.QPROBE_BASE_URL
      else process.env.QPROBE_BASE_URL = prev
    }
  })
})
