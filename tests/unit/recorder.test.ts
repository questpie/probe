import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { access, rm } from 'node:fs/promises'
import { resetSessionCache } from '../../src/core/session'
import {
  cancelRecording,
  getActiveRecording,
  isRecording,
  recordAction,
  recordingStateFile,
  startRecording,
  stopRecording,
} from '../../src/testing/recorder'

// Pin a deterministic session id so the recording-state path is stable and
// isolated from whatever git worktree the suite runs in.
const SESSION = 'rec-test'
const SESSION_STATE = `tmp/qprobe/sessions/${SESSION}/state`
let prevSession: string | undefined

beforeAll(() => {
  prevSession = process.env.QPROBE_SESSION
  process.env.QPROBE_SESSION = SESSION
  resetSessionCache()
})

afterAll(() => {
  if (prevSession === undefined) delete process.env.QPROBE_SESSION
  else process.env.QPROBE_SESSION = prevSession
  resetSessionCache()
})

afterEach(async () => {
  await cancelRecording()
  await rm('tmp/qprobe', { recursive: true, force: true })
  await rm('tests/qprobe', { recursive: true, force: true })
})

describe('recorder', () => {
  test('start creates active recording', async () => {
    await startRecording('test-flow')
    expect(await isRecording()).toBe(true)
    const rec = await getActiveRecording()
    expect(rec?.name).toBe('test-flow')
    expect(rec?.actions.length).toBe(0)
  })

  test('recordAction adds actions', async () => {
    await startRecording('actions-test')
    recordAction('browser open', ['http://localhost:3000'])
    recordAction('browser click', ['@e1'])
    recordAction('browser fill', ['@e2', 'hello'])

    const rec = await getActiveRecording()
    expect(rec?.actions.length).toBe(3)
    expect(rec?.actions[0]?.command).toBe('browser open')
    expect(rec?.actions[1]?.args[0]).toBe('@e1')
  })

  test('stop saves recording to disk', async () => {
    await startRecording('save-test')
    recordAction('browser open', ['/login'])

    const rec = await stopRecording()
    expect(rec.name).toBe('save-test')
    expect(rec.finishedAt).toBeDefined()
    expect(rec.actions.length).toBe(1)
    expect(await isRecording()).toBe(false)
  })

  test('cancel discards recording', async () => {
    await startRecording('cancel-test')
    recordAction('browser open', ['/page'])

    await cancelRecording()
    expect(await isRecording()).toBe(false)
    expect(await getActiveRecording()).toBeNull()
  })

  test('double start throws', async () => {
    await startRecording('first')
    await expect(startRecording('second')).rejects.toThrow('Already recording')
  })

  test('stop without start throws', async () => {
    await expect(stopRecording()).rejects.toThrow('No active recording')
  })
})

describe('recorder session namespacing', () => {
  test('recordingStateFile lives under the active session state dir', () => {
    expect(recordingStateFile()).toBe(`${SESSION_STATE}/recording.json`)
  })

  test('startRecording writes recording.json under the session state dir', async () => {
    await startRecording('namespaced')
    // The state file for THIS session must exist...
    await access(`${SESSION_STATE}/recording.json`)
    // ...and the legacy global path must NOT be used.
    await expect(access('tmp/qprobe/state/recording.json')).rejects.toThrow()
  })

  test('different sessions resolve to different recording paths', () => {
    const a = recordingStateFile()
    process.env.QPROBE_SESSION = 'rec-test-other'
    resetSessionCache()
    try {
      const b = recordingStateFile()
      expect(b).toBe('tmp/qprobe/sessions/rec-test-other/state/recording.json')
      expect(b).not.toBe(a)
    } finally {
      process.env.QPROBE_SESSION = SESSION
      resetSessionCache()
    }
  })
})
