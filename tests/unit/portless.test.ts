import { describe, expect, test } from 'bun:test'
import {
  isPortlessAvailable,
  isPortlessEnabled,
  isPortlessExplicit,
  portlessGetUrl,
  portlessHealthUrl,
  resolvePortlessMode,
  wrapCommand,
} from '../../src/core/portless'

describe('isPortlessEnabled', () => {
  test('defaults to ON when nothing is set', () => {
    expect(isPortlessEnabled({ env: {} })).toBe(true)
  })

  test('config false disables it', () => {
    expect(isPortlessEnabled({ config: false, env: {} })).toBe(false)
  })

  test('QPROBE_PORTLESS=0 overrides config true', () => {
    expect(isPortlessEnabled({ config: true, env: { QPROBE_PORTLESS: '0' } })).toBe(false)
  })

  test('QPROBE_PORTLESS=1 overrides config false', () => {
    expect(isPortlessEnabled({ config: false, env: { QPROBE_PORTLESS: '1' } })).toBe(true)
  })
})

describe('isPortlessExplicit', () => {
  test('true only for explicit 0/1', () => {
    expect(isPortlessExplicit({ QPROBE_PORTLESS: '1' })).toBe(true)
    expect(isPortlessExplicit({ QPROBE_PORTLESS: '0' })).toBe(true)
    expect(isPortlessExplicit({})).toBe(false)
    expect(isPortlessExplicit({ QPROBE_PORTLESS: 'yes' })).toBe(false)
  })
})

describe('resolvePortlessMode', () => {
  test('disabled → fallback (silent)', () => {
    expect(resolvePortlessMode({ enabled: false, available: false, explicit: false })).toEqual({
      mode: 'fallback',
    })
  })

  test('enabled + available → use', () => {
    expect(resolvePortlessMode({ enabled: true, available: true, explicit: false })).toEqual({
      mode: 'use',
    })
  })

  test('enabled + missing + explicit → error', () => {
    const d = resolvePortlessMode({ enabled: true, available: false, explicit: true })
    expect(d.mode).toBe('error')
    expect(d.reason).toMatch(/portless/i)
  })

  test('enabled + missing + not explicit → fallback with reason', () => {
    const d = resolvePortlessMode({ enabled: true, available: false, explicit: false })
    expect(d.mode).toBe('fallback')
    expect(d.reason).toMatch(/falling back/i)
  })
})

describe('wrapCommand', () => {
  test('prefixes portless <name>', () => {
    expect(wrapCommand('web', 'bun dev')).toBe('portless web bun dev')
  })
})

describe('portlessHealthUrl', () => {
  test('builds https://<name>.localhost<path>', () => {
    expect(portlessHealthUrl('web', '/health')).toBe('https://web.localhost/health')
  })

  test('passes through absolute urls', () => {
    expect(portlessHealthUrl('web', 'http://example.com/h')).toBe('http://example.com/h')
  })
})

describe('isPortlessAvailable', () => {
  test('uses the injected checker', async () => {
    expect(await isPortlessAvailable(async () => true)).toBe(true)
    expect(await isPortlessAvailable(async () => false)).toBe(false)
  })
})

describe('portlessGetUrl', () => {
  test('returns the URL printed by `portless get` (port + worktree accurate)', async () => {
    const run = async (args: string[]): Promise<string> => {
      expect(args).toEqual(['get', 'web'])
      return 'https://web.localhost:1355\n'
    }
    expect(await portlessGetUrl('web', run)).toBe('https://web.localhost:1355')
  })

  test('returns null when output is not a url', async () => {
    expect(await portlessGetUrl('web', async () => 'not found')).toBeNull()
  })

  test('returns null when the command throws', async () => {
    expect(
      await portlessGetUrl('web', async () => {
        throw new Error('no proxy')
      }),
    ).toBeNull()
  })
})
