import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { composeDown, composeUp } from '../../src/core/compose-engine'
import { validateConfig } from '../../src/core/config'
import { currentSharedPaths, resetSessionCache, sharedPaths } from '../../src/core/session'
import { addRef, readRefs, removeRef } from '../../src/core/shared-service'
import { type ProcessState, readPid, readState, savePid, saveState } from '../../src/core/state'

let root: string
const prevRoot = process.env.QPROBE_ROOT_DIR
const prevSession = process.env.QPROBE_SESSION

function setSession(id: string): void {
  process.env.QPROBE_SESSION = id
  resetSessionCache()
}

function mkState(name: string, pid: number): ProcessState {
  return { name, cmd: 'noop', pid, startedAt: new Date().toISOString() }
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'qprobe-shared-'))
  process.env.QPROBE_ROOT_DIR = root
  setSession('sess-a')
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

describe('config: shared field', () => {
  test('accepts shared: true', () => {
    expect(() =>
      validateConfig({ services: { db: { cmd: 'docker up', shared: true } } }),
    ).not.toThrow()
  })

  test('rejects non-boolean shared', () => {
    expect(() =>
      // @ts-expect-error intentional bad type
      validateConfig({ services: { db: { cmd: 'x', shared: 'yes' } } }),
    ).toThrow(/shared/)
  })
})

describe('refcount', () => {
  test('addRef accumulates distinct sessions', async () => {
    expect(await addRef('db', 'sess-a')).toEqual(['sess-a'])
    expect(await addRef('db', 'sess-b')).toEqual(['sess-a', 'sess-b'])
  })

  test('addRef is idempotent per session', async () => {
    await addRef('db', 'sess-a')
    expect(await addRef('db', 'sess-a')).toEqual(['sess-a'])
  })

  test('readRefs returns [] when none', async () => {
    expect(await readRefs('ghost')).toEqual([])
  })

  test('removeRef returns remaining refs', async () => {
    await addRef('db', 'sess-a')
    await addRef('db', 'sess-b')
    expect(await removeRef('db', 'sess-a')).toEqual(['sess-b'])
    expect(await removeRef('db', 'sess-b')).toEqual([])
  })
})

describe('state scope', () => {
  test('shared scope writes under <root>/shared, not the session dir', async () => {
    await savePid('db', 4242, 'shared')
    await saveState('db', mkState('db', 4242), 'shared')

    // readable via the shared scope
    expect(await readPid('db', 'shared')).toBe(4242)
    expect((await readState('db', 'shared'))?.pid).toBe(4242)

    // NOT visible in the default (session) scope
    expect(await readPid('db')).toBeNull()

    // physically under <root>/shared/pids
    const shared = sharedPaths({ rootDir: root })
    const { stat } = await import('node:fs/promises')
    expect((await stat(join(shared.pids, 'db.pid'))).isFile()).toBe(true)
  })
})

describe('composeUp reuse (shared)', () => {
  test('reuses a live shared service without respawning, and adds a ref', async () => {
    // Pre-seed a live shared "db" (use our own pid so it reads as alive).
    await savePid('db', process.pid, 'shared')
    await saveState('db', mkState('db', process.pid), 'shared')
    await addRef('db', 'sess-a')

    setSession('sess-b')
    const started = await composeUp(
      { db: { cmd: 'should-not-run', shared: true } },
      { noHealth: true },
    )

    expect(started).toContain('db')
    // ref added for the new session, original retained
    expect(await readRefs('db')).toEqual(['sess-a', 'sess-b'])
    // not respawned: shared pid file is still our seeded pid
    expect(await readPid('db', 'shared')).toBe(process.pid)
  })
})

describe('composeDown refcount gating (shared)', () => {
  test('only stops the shared service when the last ref is released', async () => {
    // Dead pid so stopProcess takes the cleanup-only branch (no real signals).
    const deadPid = 999999
    await savePid('db', deadPid, 'shared')
    await saveState('db', mkState('db', deadPid), 'shared')
    await addRef('db', 'sess-a')
    await addRef('db', 'sess-b')

    const services = { db: { cmd: 'noop', shared: true } }
    const shared = currentSharedPaths()

    // sess-a releases → still referenced by sess-b → NOT stopped
    setSession('sess-a')
    await composeDown(services)
    expect(await readRefs('db')).toEqual(['sess-b'])
    expect(await readPid('db', 'shared')).toBe(deadPid)

    // sess-b releases → no refs left → stopped + cleaned up
    setSession('sess-b')
    await composeDown(services)
    expect(await readRefs('db')).toEqual([])
    expect(await readPid('db', 'shared')).toBeNull()
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(shared.state, 'db.json'))).toBe(false)
  })
})
