import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { execFile } from 'node:child_process'
import { access, readFile, rm } from 'node:fs/promises'

const FIXTURE = 'tests/fixtures/server.ts'

function qprobe(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = execFile(
      'bun',
      ['run', 'src/cli.ts', ...args],
      { env: { ...process.env, NO_COLOR: '1', CONSOLA_LEVEL: '999' }, timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        let exitCode = 0
        if (error) {
          exitCode = typeof error.code === 'number' ? error.code : (child.exitCode ?? 1)
        }
        resolve({ stdout: stdout ?? '', stderr: stderr ?? '', exitCode })
      },
    )
  })
}

function out(r: { stdout: string; stderr: string }): string {
  return r.stdout + r.stderr
}

beforeAll(async () => {
  await qprobe('stop', '--all')
  await rm('tmp/qprobe', { recursive: true, force: true })
  await rm('tests/qprobe', { recursive: true, force: true })
})

afterAll(async () => {
  await qprobe('stop', '--all')
  await rm('tests/qprobe', { recursive: true, force: true })
})

// ═══════════════════════════════════════════════
// RECORD COMMAND
// ═══════════════════════════════════════════════
describe('qprobe record', () => {
  afterEach(async () => {
    // Cancel any active recording
    await qprobe('record', 'cancel')
    await rm('tests/qprobe', { recursive: true, force: true })
  })

  test('start creates recording', async () => {
    const r = await qprobe('record', 'start', 'my-flow')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Recording "my-flow" started')
  })

  test('stop saves recording + generates spec', async () => {
    await qprobe('record', 'start', 'stop-test')
    const r = await qprobe('record', 'stop')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('stop-test')
    expect(out(r)).toContain('.json')
    expect(out(r)).toContain('.spec.ts')
  })

  test('cancel discards recording', async () => {
    await qprobe('record', 'start', 'cancel-test')
    const r = await qprobe('record', 'cancel')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('cancelled')
  })

  test('cancel with no recording is ok', async () => {
    const r = await qprobe('record', 'cancel')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('No active recording')
  })
})

// ═══════════════════════════════════════════════
// RECORDINGS COMMAND
// ═══════════════════════════════════════════════
describe('qprobe recordings', () => {
  beforeAll(async () => {
    // Create a recording to list/show
    await qprobe('record', 'start', 'listing-test')
    await qprobe('record', 'stop')
  })

  afterAll(async () => {
    await rm('tests/qprobe', { recursive: true, force: true })
  })

  test('list shows recordings', async () => {
    const r = await qprobe('recordings', 'list')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('listing-test')
  })

  test('show displays recording details', async () => {
    const r = await qprobe('recordings', 'show', 'listing-test')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('listing-test')
    expect(out(r)).toContain('Actions:')
  })

  test('delete removes recording', async () => {
    // Create one to delete
    await qprobe('record', 'start', 'delete-me')
    await qprobe('record', 'stop')

    const r = await qprobe('recordings', 'delete', 'delete-me')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Deleted')
  })

  test('show nonexistent fails', async () => {
    const r = await qprobe('recordings', 'show', 'ghost')
    expect(r.exitCode).toBe(1)
    expect(out(r)).toContain('not found')
  })
})

// ═══════════════════════════════════════════════
// COMPOSE COMMAND
// ═══════════════════════════════════════════════
describe('qprobe compose', () => {
  test('compose up without config shows error', async () => {
    const r = await qprobe('compose', 'up')
    expect(r.exitCode).not.toBe(0)
  })

  test('compose down works when nothing running', async () => {
    const r = await qprobe('compose', 'down')
    expect(r.exitCode).toBe(0)
  })

  test('compose status shows running services', async () => {
    const r = await qprobe('compose', 'status')
    expect(r.exitCode).toBe(0)
    // Either shows services or "No services running"
    expect(out(r).length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════
// ASSERT COMMAND
// ═══════════════════════════════════════════════
describe('qprobe assert', () => {
  const PORT = 14580

  beforeAll(async () => {
    const r = await qprobe(
      'start', 'assert-srv', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--port', String(PORT), '--env', `PORT=${PORT}`, '--timeout', '10s',
    )
    if (r.exitCode !== 0) throw new Error(`start failed: ${out(r)}`)
  })

  afterAll(async () => {
    await qprobe('stop', 'assert-srv')
  })

  test('assert status passes for correct code', async () => {
    const r = await qprobe('assert', 'status', '200', `http://localhost:${PORT}/api/health`)
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('200')
  })

  test('assert status fails for wrong code', async () => {
    const r = await qprobe('assert', 'status', '200', `http://localhost:${PORT}/api/nonexistent`)
    expect(r.exitCode).toBe(1)
  })

  test('assert status 404', async () => {
    const r = await qprobe('assert', 'status', '404', `http://localhost:${PORT}/nope`)
    expect(r.exitCode).toBe(0)
  })
})

// ═══════════════════════════════════════════════
// INIT COMMAND
// ═══════════════════════════════════════════════
describe('qprobe init', () => {
  afterEach(async () => {
    try {
      await rm('qprobe.config.ts')
    } catch {
      // ignore
    }
  })

  test('creates config file', async () => {
    // First remove if exists
    try { await rm('qprobe.config.ts') } catch { /* ignore */ }

    const r = await qprobe('init')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Created qprobe.config.ts')

    const content = await readFile('qprobe.config.ts', 'utf-8')
    expect(content).toContain('defineConfig')
    expect(content).toContain('agent-browser')
  })

  test('refuses to overwrite without --force', async () => {
    await qprobe('init')
    const r = await qprobe('init')
    expect(r.exitCode).toBe(1)
    expect(out(r)).toContain('already exists')
  })

  test('--force overwrites', async () => {
    await qprobe('init')
    const r = await qprobe('init', '--force')
    expect(r.exitCode).toBe(0)
  })
})

// ═══════════════════════════════════════════════
// REPLAY COMMAND (routing only — no Playwright installed)
// ═══════════════════════════════════════════════
describe('qprobe replay', () => {
  test('replay without name or --all shows error', async () => {
    const r = await qprobe('replay')
    expect(r.exitCode).toBe(1)
    expect(out(r)).toContain('Provide a recording name')
  })
})
