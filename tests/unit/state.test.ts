import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import { resetSessionCache } from '../../src/core/session'
import {
  ensureLogsDir,
  getLogPath,
  getLogsDir,
  listProcessNames,
  readPid,
  readState,
  removePid,
  removeState,
  savePid,
  saveState,
} from '../../src/core/state'
import type { ProcessState } from '../../src/core/state'

// Pin a deterministic session id so path assertions are stable regardless of the
// git worktree the suite runs in.
const SESSION = 'unit-state'
const SESSION_BASE = `tmp/qprobe/sessions/${SESSION}`
let prevSession: string | undefined

beforeAll(async () => {
  prevSession = process.env.QPROBE_SESSION
  process.env.QPROBE_SESSION = SESSION
  resetSessionCache()
  await rm('tmp/qprobe', { recursive: true, force: true })
})

afterAll(async () => {
  await rm('tmp/qprobe', { recursive: true, force: true })
  if (prevSession === undefined) delete process.env.QPROBE_SESSION
  else process.env.QPROBE_SESSION = prevSession
  resetSessionCache()
})

describe('PID files', () => {
  test('save and read PID', async () => {
    await savePid('test-proc', 12345)
    const pid = await readPid('test-proc')
    expect(pid).toBe(12345)
  })

  test('readPid returns null for nonexistent', async () => {
    const pid = await readPid('nonexistent')
    expect(pid).toBeNull()
  })

  test('removePid cleans up', async () => {
    await savePid('to-remove', 99999)
    expect(await readPid('to-remove')).toBe(99999)
    await removePid('to-remove')
    expect(await readPid('to-remove')).toBeNull()
  })

  test('removePid does not throw for nonexistent', async () => {
    await removePid('never-existed')
  })
})

describe('state files', () => {
  const mockState: ProcessState = {
    name: 'myproc',
    cmd: 'bun run server.ts',
    pid: 11111,
    port: 3000,
    ready: 'ready on',
    startedAt: '2026-01-01T00:00:00.000Z',
  }

  test('save and read state', async () => {
    await saveState('myproc', mockState)
    const state = await readState('myproc')
    expect(state).toEqual(mockState)
  })

  test('readState returns null for nonexistent', async () => {
    const state = await readState('ghost')
    expect(state).toBeNull()
  })

  test('removeState cleans up', async () => {
    await saveState('ephemeral', mockState)
    expect(await readState('ephemeral')).not.toBeNull()
    await removeState('ephemeral')
    expect(await readState('ephemeral')).toBeNull()
  })
})

describe('listProcessNames', () => {
  test('lists saved PIDs', async () => {
    await savePid('alpha', 1)
    await savePid('beta', 2)
    const names = await listProcessNames()
    expect(names).toContain('alpha')
    expect(names).toContain('beta')
  })
})

describe('log paths (session-namespaced)', () => {
  test('getLogsDir is namespaced under the active session', () => {
    expect(getLogsDir()).toBe(`${SESSION_BASE}/logs`)
  })

  test('getLogPath is namespaced under the active session', () => {
    expect(getLogPath('server')).toBe(`${SESSION_BASE}/logs/server.log`)
  })

  test('ensureLogsDir creates the session log dir', async () => {
    await ensureLogsDir()
    const { stat } = await import('node:fs/promises')
    const s = await stat(`${SESSION_BASE}/logs`)
    expect(s.isDirectory()).toBe(true)
  })
})
