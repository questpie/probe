import { describe, expect, test } from 'bun:test'
import { ConfigError, defineConfig, resolveBaseUrl, validateConfig } from '../../src/core/config'
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

describe('validateConfig', () => {
  test('valid config passes', () => {
    const config: ProbeConfig = {
      services: {
        api: { cmd: 'bun dev', port: 3000, ready: 'ready on', depends: [] },
      },
      browser: { driver: 'agent-browser', baseUrl: 'http://localhost:3000' },
      http: { baseUrl: 'http://localhost:3000' },
    }
    expect(() => validateConfig(config)).not.toThrow()
  })

  test('empty config passes', () => {
    expect(() => validateConfig({})).not.toThrow()
  })

  test('service missing cmd throws with helpful message', () => {
    const config: ProbeConfig = {
      services: {
        api: { cmd: '' },
      },
    }
    expect(() => validateConfig(config)).toThrow(ConfigError)
    expect(() => validateConfig(config)).toThrow(/missing required field "cmd"/)
  })

  test('detects "command" typo and suggests "cmd"', () => {
    const config = {
      services: {
        api: { command: 'bun dev' },
      },
    } as unknown as ProbeConfig
    expect(() => validateConfig(config)).toThrow(/Did you mean "cmd"/)
  })

  test('detects "dependsOn" typo and suggests "depends"', () => {
    const config = {
      services: {
        api: { cmd: 'bun dev', dependsOn: ['db'] },
      },
    } as unknown as ProbeConfig
    expect(() => validateConfig(config)).toThrow(/Did you mean "depends"/)
  })

  test('invalid port throws', () => {
    const config: ProbeConfig = {
      services: {
        api: { cmd: 'bun dev', port: 99999 },
      },
    }
    expect(() => validateConfig(config)).toThrow(/port must be a number between 1 and 65535/)
  })

  test('depends referencing non-existent service throws', () => {
    const config: ProbeConfig = {
      services: {
        api: { cmd: 'bun dev', depends: ['nonexistent'] },
      },
    }
    expect(() => validateConfig(config)).toThrow(/no service named "nonexistent" exists/)
  })

  test('invalid browser driver throws', () => {
    const config = {
      browser: { driver: 'selenium' },
    } as unknown as ProbeConfig
    expect(() => validateConfig(config)).toThrow(/Invalid browser.driver/)
  })

  test('invalid baseUrl throws', () => {
    const config: ProbeConfig = {
      http: { baseUrl: 'not-a-url' },
    }
    expect(() => validateConfig(config)).toThrow(/Invalid http.baseUrl/)
  })

  test('invalid browser baseUrl throws', () => {
    const config: ProbeConfig = {
      browser: { baseUrl: 'nope' },
    }
    expect(() => validateConfig(config)).toThrow(/Invalid browser.baseUrl/)
  })

  test('unknown top-level field throws', () => {
    const config = { foobar: true } as unknown as ProbeConfig
    expect(() => validateConfig(config)).toThrow(/Unknown top-level field "foobar"/)
  })

  test('invalid health path throws', () => {
    const config: ProbeConfig = {
      services: {
        api: { cmd: 'bun dev', health: 'no-slash' },
      },
    }
    expect(() => validateConfig(config)).toThrow(/must be a URL or path starting with/)
  })

  test('multiple errors are aggregated', () => {
    const config = {
      services: {
        api: { command: 'bun dev', port: -1 },
      },
    } as unknown as ProbeConfig
    try {
      validateConfig(config)
      expect(true).toBe(false) // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError)
      const msg = (err as ConfigError).message
      // Should contain multiple errors
      expect(msg).toContain('Did you mean "cmd"')
      expect(msg).toContain('missing required field "cmd"')
      expect(msg).toContain('port must be a number')
    }
  })

  test('valid depends passes', () => {
    const config: ProbeConfig = {
      services: {
        db: { cmd: 'docker up' },
        api: { cmd: 'bun dev', depends: ['db'] },
      },
    }
    expect(() => validateConfig(config)).not.toThrow()
  })

  test('negative timeout throws', () => {
    const config: ProbeConfig = {
      tests: { timeout: -1 },
    }
    expect(() => validateConfig(config)).toThrow(/Invalid tests.timeout/)
  })
})
