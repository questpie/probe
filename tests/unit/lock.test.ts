import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { composeUp } from '../../src/core/compose-engine'
import { acquireLock, isLocked, withLock } from '../../src/core/lock'
import { currentSessionPaths, resetSessionCache } from '../../src/core/session'

let root: string
const prevRoot = process.env.QPROBE_ROOT_DIR
const prevSession = process.env.QPROBE_SESSION

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'qprobe-lock-'))
  process.env.QPROBE_ROOT_DIR = root
  process.env.QPROBE_SESSION = 'sess-lock'
  resetSessionCache()
  await mkdir(currentSessionPaths().base, { recursive: true })
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

describe('acquireLock / release', () => {
  test('acquires when free, blocks a second live acquire, frees on release', async () => {
    const a = await acquireLock('compose')
    expect(a).not.toBeNull()
    expect(existsSync(a!.path)).toBe(true)

    // second acquire fails — held by a live pid (this process)
    expect(await acquireLock('compose')).toBeNull()

    await a!.release()
    expect(existsSync(a!.path)).toBe(false)

    // now acquirable again
    const b = await acquireLock('compose')
    expect(b).not.toBeNull()
    await b!.release()
  })

  test('takes over a stale lock (dead holder pid)', async () => {
    const lockFile = join(currentSessionPaths().base, 'compose.lock')
    writeFileSync(lockFile, JSON.stringify({ pid: 999999, at: new Date().toISOString() }))

    const h = await acquireLock('compose')
    expect(h).not.toBeNull()
    await h!.release()
  })
})

describe('isLocked', () => {
  test('reflects a live held lock', async () => {
    expect(await isLocked('compose')).toBe(false)
    const h = await acquireLock('compose')
    expect(await isLocked('compose')).toBe(true)
    await h!.release()
    expect(await isLocked('compose')).toBe(false)
  })
})

describe('withLock', () => {
  test('runs fn and releases, even on throw', async () => {
    await expect(
      withLock('compose', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    // lock released despite the throw
    expect(await isLocked('compose')).toBe(false)
  })

  test('throws when the lock is already held by a live process', async () => {
    const lockFile = join(currentSessionPaths().base, 'compose.lock')
    writeFileSync(lockFile, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))
    await expect(withLock('compose', async () => 'x')).rejects.toThrow(/lock/i)
  })
})

describe('composeUp integration', () => {
  test('refuses to run when a live compose lock is already held', async () => {
    const lockFile = join(currentSessionPaths().base, 'compose.lock')
    writeFileSync(lockFile, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))

    await expect(
      composeUp({ web: { cmd: 'noop' } }, { noHealth: true, portless: false }),
    ).rejects.toThrow(/lock/i)
  })
})
