import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
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

beforeAll(async () => {
  await rm('tmp/qprobe', { recursive: true, force: true })
})

afterAll(async () => {
  await rm('tmp/qprobe', { recursive: true, force: true })
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

describe('log paths', () => {
  test('getLogsDir returns correct path', () => {
    expect(getLogsDir()).toBe('tmp/qprobe/logs')
  })

  test('getLogPath returns correct path', () => {
    expect(getLogPath('server')).toBe('tmp/qprobe/logs/server.log')
  })

  test('ensureLogsDir creates dir', async () => {
    await ensureLogsDir()
    const { stat } = await import('node:fs/promises')
    const s = await stat('tmp/qprobe/logs')
    expect(s.isDirectory()).toBe(true)
  })
})
