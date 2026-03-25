import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rm, writeFile } from 'node:fs/promises'
import { readAllLogs, readLogs } from '../../src/core/log-reader'
import { ensureLogsDir, getLogPath } from '../../src/core/state'

const LOG_LINES = [
  '2026-03-25T10:00:00.000Z INFO  Server starting',
  '2026-03-25T10:00:01.000Z INFO  ready on http://localhost:3000',
  '2026-03-25T10:00:02.000Z WARN  Deprecated API called',
  '2026-03-25T10:00:03.000Z ERROR TypeError: cannot read property',
  '2026-03-25T10:00:04.000Z DEBUG Query took 45ms',
  '2026-03-25T10:00:05.000Z INFO  Request GET /api/users 200 12ms',
  '2026-03-25T10:00:06.000Z ERROR Connection refused to db:5432',
  '2026-03-25T10:00:07.000Z INFO  Retrying connection...',
  '2026-03-25T10:00:08.000Z INFO  Connected to database',
  '2026-03-25T10:00:09.000Z INFO  Health check passed',
].join('\n')

beforeAll(async () => {
  await rm('tmp/qprobe', { recursive: true, force: true })
  await ensureLogsDir()
  await writeFile(getLogPath('reader-svc'), `${LOG_LINES}\n`, 'utf-8')
  // Second service for --all tests
  await writeFile(
    getLogPath('reader-svc2'),
    [
      '2026-03-25T10:00:00.500Z INFO  Worker started',
      '2026-03-25T10:00:05.500Z ERROR Job failed: timeout',
    ].join('\n') + '\n',
    'utf-8',
  )
  // PID files so listProcessNames finds them
  const { savePid } = await import('../../src/core/state')
  await savePid('reader-svc', 1)
  await savePid('reader-svc2', 2)
})

afterAll(async () => {
  await rm('tmp/qprobe', { recursive: true, force: true })
})

describe('readLogs', () => {
  test('reads all entries (default 50 lines)', async () => {
    const entries = await readLogs('reader-svc')
    expect(entries.length).toBe(10)
  })

  test('respects --lines limit', async () => {
    const entries = await readLogs('reader-svc', { lines: 3 })
    expect(entries.length).toBe(3)
    // Should return last 3
    expect(entries[0]!.message).toContain('Retrying')
  })

  test('filters by --level error', async () => {
    const entries = await readLogs('reader-svc', { level: 'error' })
    expect(entries.length).toBe(2)
    for (const e of entries) {
      expect(e.level).toBe('ERROR')
    }
  })

  test('filters by --level warn', async () => {
    const entries = await readLogs('reader-svc', { level: 'warn' })
    expect(entries.length).toBe(1)
    expect(entries[0]!.message).toContain('Deprecated')
  })

  test('filters by --level debug', async () => {
    const entries = await readLogs('reader-svc', { level: 'debug' })
    expect(entries.length).toBe(1)
    expect(entries[0]!.message).toContain('Query')
  })

  test('filters by --grep pattern', async () => {
    const entries = await readLogs('reader-svc', { grep: 'connect' })
    expect(entries.length).toBe(3) // "Connection refused" + "Retrying connection" + "Connected to database"
  })

  test('grep is case-insensitive', async () => {
    const entries = await readLogs('reader-svc', { grep: 'HEALTH' })
    expect(entries.length).toBe(1)
  })

  test('grep supports regex', async () => {
    const entries = await readLogs('reader-svc', { grep: '\\d+ms' })
    expect(entries.length).toBe(2) // "Query took 45ms" + "200 12ms"
  })

  test('combined level + grep', async () => {
    const entries = await readLogs('reader-svc', { level: 'error', grep: 'connection' })
    expect(entries.length).toBe(1)
    expect(entries[0]!.message).toContain('Connection refused')
  })

  test('returns empty for nonexistent process', async () => {
    const entries = await readLogs('ghost-process')
    expect(entries.length).toBe(0)
  })

  test('entries have source set', async () => {
    const entries = await readLogs('reader-svc', { lines: 1 })
    expect(entries[0]!.source).toBe('reader-svc')
  })
})

describe('readAllLogs', () => {
  test('merges logs from all processes', async () => {
    const entries = await readAllLogs({ lines: 100 })
    expect(entries.length).toBe(12) // 10 + 2
    // Should be sorted by timestamp
    const sources = new Set(entries.map((e) => e.source))
    expect(sources.has('reader-svc')).toBe(true)
    expect(sources.has('reader-svc2')).toBe(true)
  })

  test('respects lines limit on merged result', async () => {
    const entries = await readAllLogs({ lines: 5 })
    expect(entries.length).toBe(5)
  })

  test('filters work on merged logs', async () => {
    const entries = await readAllLogs({ level: 'error', lines: 100 })
    expect(entries.length).toBe(3) // 2 from svc + 1 from svc2
  })

  test('sorted chronologically', async () => {
    const entries = await readAllLogs({ lines: 100 })
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i]!.timestamp >= entries[i - 1]!.timestamp).toBe(true)
    }
  })
})
