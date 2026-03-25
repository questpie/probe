import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import {
  cancelRecording,
  getActiveRecording,
  isRecording,
  recordAction,
  startRecording,
  stopRecording,
} from '../../src/testing/recorder'

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
