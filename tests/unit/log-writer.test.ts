import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readFile, rm } from 'node:fs/promises'
import { createLogWriter, writeLog } from '../../src/core/log-writer'
import { getLogPath } from '../../src/core/state'

beforeAll(async () => {
  await rm('tmp/qprobe', { recursive: true, force: true })
})

afterAll(async () => {
  await rm('tmp/qprobe', { recursive: true, force: true })
})

describe('writeLog', () => {
  test('writes timestamped lines', async () => {
    await writeLog('writer-test', 'Hello world')
    const content = await readFile(getLogPath('writer-test'), 'utf-8')
    expect(content).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z INFO\s+Hello world\n$/)
  })

  test('explicit ERROR level', async () => {
    await writeLog('writer-test', 'Something broke', 'ERROR')
    const content = await readFile(getLogPath('writer-test'), 'utf-8')
    expect(content).toContain('ERROR Something broke')
  })

  test('auto-detects error level from content', async () => {
    await writeLog('detect-test', 'TypeError: cannot read property')
    const content = await readFile(getLogPath('detect-test'), 'utf-8')
    // 'error' is in 'TypeError' so it should detect ERROR
    expect(content).toContain('ERROR')
  })

  test('auto-detects warn level', async () => {
    await writeLog('detect-test', 'DeprecationWarning: use new API')
    const content = await readFile(getLogPath('detect-test'), 'utf-8')
    expect(content).toContain('WARN')
  })

  test('skips empty data', async () => {
    await writeLog('empty-test', '')
    const content = await readFile(getLogPath('empty-test'), 'utf-8').catch(() => '')
    // File shouldn't exist or should be empty
    expect(content).toBe('')
  })

  test('handles multiline data', async () => {
    await writeLog('multi-test', 'line1\nline2\nline3')
    const content = await readFile(getLogPath('multi-test'), 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines.length).toBe(3)
  })
})

describe('createLogWriter', () => {
  test('stdout writes INFO level', async () => {
    const writer = createLogWriter('logwriter-stdout')
    writer.stdout('Server started')
    await new Promise((r) => setTimeout(r, 100))
    const content = await readFile(getLogPath('logwriter-stdout'), 'utf-8')
    expect(content).toContain('INFO')
    expect(content).toContain('Server started')
  })

  test('stderr writes ERROR level', async () => {
    const writer = createLogWriter('logwriter-stderr')
    writer.stderr('Fatal crash')
    await new Promise((r) => setTimeout(r, 100))
    const content = await readFile(getLogPath('logwriter-stderr'), 'utf-8')
    expect(content).toContain('ERROR')
    expect(content).toContain('Fatal crash')
  })

  test('handles Buffer input', async () => {
    const writer = createLogWriter('logwriter-buffer')
    writer.stdout(Buffer.from('Buffer message'))
    await new Promise((r) => setTimeout(r, 100))
    const content = await readFile(getLogPath('logwriter-buffer'), 'utf-8')
    expect(content).toContain('Buffer message')
  })
})
