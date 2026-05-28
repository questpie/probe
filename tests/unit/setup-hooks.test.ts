import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { composeUp } from '../../src/core/compose-engine'
import { validateConfig } from '../../src/core/config'
import { resetSessionCache } from '../../src/core/session'
import { hasRunSetup, interpolate, runSetup } from '../../src/core/setup-hooks'
import { savePid, saveState } from '../../src/core/state'

let root: string
const prevRoot = process.env.QPROBE_ROOT_DIR
const prevSession = process.env.QPROBE_SESSION

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'qprobe-setup-'))
  process.env.QPROBE_ROOT_DIR = root
  process.env.QPROBE_SESSION = 'sess-x'
  resetSessionCache()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

afterAll(() => {
  if (prevRoot === undefined) delete process.env.QPROBE_ROOT_DIR
  else process.env.QPROBE_ROOT_DIR = prevRoot
  if (prevSession === undefined) delete process.env.QPROBE_SESSION
  else process.env.QPROBE_SESSION = prevSession
  resetSessionCache()
})

describe('interpolate', () => {
  test('substitutes known ${VARS}', () => {
    expect(interpolate('migrate ${SESSION} on ${PORT}', { SESSION: 's', PORT: '3000' })).toBe(
      'migrate s on 3000',
    )
  })

  test('leaves text without vars untouched', () => {
    expect(interpolate('bun db:migrate', {})).toBe('bun db:migrate')
  })

  test('leaves unknown placeholders as-is (surfaces typos)', () => {
    expect(interpolate('${NOPE}', { SESSION: 's' })).toBe('${NOPE}')
  })
})

describe('runSetup idempotency', () => {
  test('runs each command once, interpolated, then marks done', async () => {
    const ran: string[] = []
    const exec = async (cmd: string): Promise<void> => {
      ran.push(cmd)
    }

    const first = await runSetup('db', ['migrate ${SESSION}', 'seed'], {
      scope: 'shared',
      vars: { SESSION: 'sess-x' },
      exec,
    })
    expect(first).toEqual(['migrate sess-x', 'seed'])
    expect(ran).toEqual(['migrate sess-x', 'seed'])

    // Second run is a no-op (marker present)
    const second = await runSetup('db', ['migrate ${SESSION}', 'seed'], {
      scope: 'shared',
      vars: { SESSION: 'sess-x' },
      exec,
    })
    expect(second).toEqual([])
    expect(ran).toEqual(['migrate sess-x', 'seed'])
  })

  test('empty command list is a no-op but still marks done', async () => {
    const out = await runSetup('svc', [], { scope: 'session' })
    expect(out).toEqual([])
    expect(await hasRunSetup('svc', 'session')).toBe(true)
  })
})

describe('runSetup scope isolation', () => {
  test('session and shared markers are independent', async () => {
    const exec = async (): Promise<void> => {}
    await runSetup('svc', ['a'], { scope: 'session', exec })
    expect(await hasRunSetup('svc', 'session')).toBe(true)
    expect(await hasRunSetup('svc', 'shared')).toBe(false)
  })
})

describe('composeUp integration', () => {
  test('runs setup once after a (reused) shared service is up', async () => {
    // Seed a live shared service so composeUp reuses it (no real spawn).
    await savePid('db', process.pid, 'shared')
    await saveState(
      'db',
      { name: 'db', cmd: 'noop', pid: process.pid, startedAt: new Date().toISOString() },
      'shared',
    )

    await composeUp({ db: { cmd: 'noop', shared: true, setup: ['true'] } }, { noHealth: true })
    expect(await hasRunSetup('db', 'shared')).toBe(true)
  })
})

describe('config: setup field', () => {
  test('accepts setup: string[]', () => {
    expect(() =>
      validateConfig({ services: { db: { cmd: 'x', setup: ['bun db:migrate'] } } }),
    ).not.toThrow()
  })

  test('rejects non-array setup', () => {
    expect(() =>
      // @ts-expect-error intentional bad type
      validateConfig({ services: { db: { cmd: 'x', setup: 'bun db:migrate' } } }),
    ).toThrow(/setup/)
  })

  test('rejects non-string setup entries', () => {
    expect(() =>
      // @ts-expect-error intentional bad type
      validateConfig({ services: { db: { cmd: 'x', setup: [1, 2] } } }),
    ).toThrow(/setup/)
  })
})
