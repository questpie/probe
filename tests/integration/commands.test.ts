import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { execFile } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'

const FIXTURE = 'tests/fixtures/server.ts'
const CRASH_FIXTURE = 'tests/fixtures/crash.ts'

function qprobe(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(
      'bun',
      ['run', 'src/cli.ts', ...args],
      { env: { ...process.env, NO_COLOR: '1', CONSOLA_LEVEL: '999' }, timeout: 30_000 },
      (error, stdout, stderr) => {
        const exitCode = error && 'code' in error ? (error.code as number) : error ? 1 : 0
        resolve({ stdout, stderr, exitCode })
      },
    )
  })
}

function out(r: { stdout: string; stderr: string }): string {
  return r.stdout + r.stderr
}

function parseJson(r: { stdout: string; stderr: string }): unknown {
  const text = out(r)
  // Strip consola prefixes like [log], [info], etc.
  const cleaned = text.replace(/^\[(?:log|info|warn|error|success|debug)\]\s*/gm, '')
  // Find first [ or { in cleaned text
  const match = cleaned.match(/[\[{][\s\S]*/)
  if (!match) throw new Error(`No JSON found in: ${text}`)
  return JSON.parse(match[0])
}

beforeAll(async () => {
  await qprobe('stop', '--all')
  await rm('tmp/qprobe', { recursive: true, force: true })
})

afterAll(async () => {
  await qprobe('stop', '--all')
})

// ═══════════════════════════════════════════════
// START COMMAND
// ═══════════════════════════════════════════════
describe('qprobe start', () => {
  afterEach(async () => {
    await qprobe('stop', '--all')
  })

  test('starts a process with --ready pattern', async () => {
    const r = await qprobe(
      'start', 'srv1', `bun run ${FIXTURE}`,
      '--ready', 'ready on',
      '--port', '14501',
      '--timeout', '10s',
      '--env', 'PORT=14501',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Started')
    expect(out(r)).toContain('srv1')
  }, 15_000)

  test('starts a process without --ready (fire and forget)', async () => {
    const r = await qprobe(
      'start', 'nrdy', `bun run ${FIXTURE}`,
      '--env', 'PORT=14502',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Started')
  }, 10_000)

  test('rejects duplicate start', async () => {
    await qprobe(
      'start', 'dup', `bun run ${FIXTURE}`,
      '--ready', 'ready on',
      '--env', 'PORT=14503',
      '--timeout', '10s',
    )
    const r2 = await qprobe(
      'start', 'dup', `bun run ${FIXTURE}`,
      '--env', 'PORT=14504',
    )
    expect(r2.exitCode).toBe(1)
    expect(out(r2)).toContain('already running')
  }, 15_000)

  test('exits 1 when process crashes before ready', async () => {
    const r = await qprobe(
      'start', 'crasher', `bun run ${CRASH_FIXTURE}`,
      '--ready', 'never-matches',
      '--timeout', '3s',
    )
    expect(r.exitCode).not.toBe(0)
    expect(out(r)).toMatch(/exited|Timeout/)
  }, 10_000)

  test('--env passes environment variables', async () => {
    const r = await qprobe(
      'start', 'envtest', `bun run ${FIXTURE}`,
      '--ready', 'ready on',
      '--env', 'PORT=14505',
      '--timeout', '10s',
    )
    expect(r.exitCode).toBe(0)
  }, 15_000)

  test('--env supports comma-separated KEY=VAL pairs', async () => {
    const r = await qprobe(
      'start', 'multienv', `bun run ${FIXTURE}`,
      '--ready', 'ready on',
      '--env', 'PORT=14506,NODE_ENV=test',
      '--timeout', '10s',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Started')
  }, 15_000)
})

// ═══════════════════════════════════════════════
// STOP COMMAND
// ═══════════════════════════════════════════════
describe('qprobe stop', () => {
  afterEach(async () => {
    await qprobe('stop', '--all')
  })

  test('stops a named process', async () => {
    await qprobe(
      'start', 'stopme', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--env', 'PORT=14510', '--timeout', '10s',
    )
    const r = await qprobe('stop', 'stopme')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Stopped')
  }, 15_000)

  test('--all stops everything', async () => {
    await qprobe(
      'start', 'a1', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--env', 'PORT=14511', '--timeout', '10s',
    )
    await qprobe(
      'start', 'a2', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--env', 'PORT=14512', '--timeout', '10s',
    )
    const r = await qprobe('stop', '--all')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('2 process')
  }, 20_000)

  test('--all with no processes is ok', async () => {
    const r = await qprobe('stop', '--all')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('No processes')
  })

  test('stopping nonexistent process fails', async () => {
    const r = await qprobe('stop', 'ghost')
    expect(r.exitCode).toBe(1)
    expect(out(r)).toContain('No PID')
  })
})

// ═══════════════════════════════════════════════
// RESTART COMMAND
// ═══════════════════════════════════════════════
describe('qprobe restart', () => {
  afterEach(async () => {
    await qprobe('stop', '--all')
  })

  test('restarts with original config', async () => {
    await qprobe(
      'start', 'rst', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--port', '14520', '--env', 'PORT=14520', '--timeout', '10s',
    )
    const r = await qprobe('restart', 'rst')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Restarted')

    const ps = await qprobe('ps', '--json')
    expect(out(ps)).toContain('rst')
    expect(out(ps)).toContain('14520') // port preserved
  }, 20_000)

  test('restart nonexistent fails', async () => {
    const r = await qprobe('restart', 'ghost')
    expect(r.exitCode).toBe(1)
    expect(out(r)).toContain('No saved state')
  })
})

// ═══════════════════════════════════════════════
// PS COMMAND
// ═══════════════════════════════════════════════
describe('qprobe ps', () => {
  afterEach(async () => {
    await qprobe('stop', '--all')
  })

  test('shows no processes when empty', async () => {
    const r = await qprobe('ps')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('No processes')
  })

  test('lists running processes', async () => {
    await qprobe(
      'start', 'listed', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--port', '14530', '--env', 'PORT=14530', '--timeout', '10s',
    )
    const r = await qprobe('ps')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('listed')
    expect(out(r)).toContain('14530')
    expect(out(r)).toContain('running')
  }, 15_000)

  test('--json outputs valid JSON', async () => {
    await qprobe(
      'start', 'jsonps', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--port', '14531', '--env', 'PORT=14531', '--timeout', '10s',
    )
    const r = await qprobe('ps', '--json')
    expect(r.exitCode).toBe(0)
    const data = parseJson(r)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].name).toBe('jsonps')
    expect(data[0].port).toBe(14531)
    expect(data[0].status).toBe('running')
  }, 15_000)

  test('cleans up dead processes from listing', async () => {
    // Start and then kill externally
    await qprobe(
      'start', 'deadproc', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--env', 'PORT=14532', '--timeout', '10s',
    )
    // Kill it directly
    const psJson = await qprobe('ps', '--json')
    const procs = parseJson(psJson)
    const pid = procs.find((p: { name: string }) => p.name === 'deadproc')?.pid
    if (pid) process.kill(pid, 'SIGKILL')
    await new Promise((r) => setTimeout(r, 200))

    const r = await qprobe('ps')
    expect(out(r)).not.toContain('deadproc')
  }, 15_000)
})

// ═══════════════════════════════════════════════
// HEALTH COMMAND
// ═══════════════════════════════════════════════
describe('qprobe health', () => {
  const PORT = 14540

  beforeAll(async () => {
    const r = await qprobe(
      'start', 'health-srv', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--port', String(PORT), '--env', `PORT=${PORT}`, '--timeout', '10s',
    )
    if (r.exitCode !== 0) throw new Error(`start failed: ${out(r)}`)
  })

  afterAll(async () => {
    await qprobe('stop', 'health-srv')
  })

  test('succeeds when URL responds 200', async () => {
    const r = await qprobe('health', `http://localhost:${PORT}/api/health`, '--timeout', '5s')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('responding')
    expect(out(r)).toContain('200')
  }, 10_000)

  test('custom --status code', async () => {
    const r = await qprobe(
      'health', `http://localhost:${PORT}/api/nonexistent`,
      '--status', '404', '--timeout', '3s',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('404')
  }, 10_000)

  test('fails when URL does not respond in time', async () => {
    const r = await qprobe('health', 'http://localhost:19999/nope', '--timeout', '1s')
    expect(r.exitCode).toBe(3)
    expect(out(r)).toContain('did not respond')
  }, 5_000)

  test('--interval controls retry frequency', async () => {
    const r = await qprobe(
      'health', `http://localhost:${PORT}/api/health`,
      '--interval', '500ms', '--timeout', '3s',
    )
    expect(r.exitCode).toBe(0)
  }, 10_000)
})

// ═══════════════════════════════════════════════
// LOGS COMMAND
// ═══════════════════════════════════════════════
describe('qprobe logs', () => {
  const PORT = 14550

  beforeAll(async () => {
    const r = await qprobe(
      'start', 'log-srv', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--env', `PORT=${PORT}`, '--timeout', '10s',
    )
    if (r.exitCode !== 0) throw new Error(`start failed: ${out(r)}`)
    // Generate some log content by making requests
    await new Promise((r) => setTimeout(r, 500))
  })

  afterAll(async () => {
    await qprobe('stop', 'log-srv')
  })

  test('reads logs for a process', async () => {
    const r = await qprobe('logs', 'log-srv')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('ready on')
  })

  test('--lines limits output', async () => {
    const r = await qprobe('logs', 'log-srv', '--lines', '1')
    expect(r.exitCode).toBe(0)
    const lines = out(r).trim().split('\n').filter((l) => l.length > 0)
    expect(lines.length).toBe(1)
  })

  test('--grep filters content', async () => {
    const r = await qprobe('logs', 'log-srv', '--grep', 'ready')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('ready')
  })

  test('--json outputs JSON', async () => {
    const r = await qprobe('logs', 'log-srv', '--json')
    expect(r.exitCode).toBe(0)
    const data = parseJson(r)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]).toHaveProperty('timestamp')
    expect(data[0]).toHaveProperty('level')
    expect(data[0]).toHaveProperty('message')
  })

  test('--all merges logs from all processes', async () => {
    // Start another service
    await qprobe(
      'start', 'log-srv2', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--env', `PORT=${PORT + 1}`, '--timeout', '10s',
    )
    await new Promise((r) => setTimeout(r, 500))

    const r = await qprobe('logs', '--all')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('[log-srv]')
    expect(out(r)).toContain('[log-srv2]')

    await qprobe('stop', 'log-srv2')
  }, 15_000)

  test('no name without --all fails', async () => {
    const r = await qprobe('logs')
    expect(r.exitCode).toBe(1)
    expect(out(r)).toContain('Provide a process name')
  })

  test('nonexistent process shows empty', async () => {
    const r = await qprobe('logs', 'nonexistent-proc')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('No log entries')
  })
})

// ═══════════════════════════════════════════════
// HTTP COMMAND
// ═══════════════════════════════════════════════
describe('qprobe http', () => {
  const PORT = 14560

  beforeAll(async () => {
    const r = await qprobe(
      'start', 'http-srv', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--port', String(PORT), '--env', `PORT=${PORT}`, '--timeout', '10s',
    )
    if (r.exitCode !== 0) throw new Error(`start failed: ${out(r)}`)
  })

  afterAll(async () => {
    await qprobe('stop', 'http-srv')
  })

  test('GET returns response body', async () => {
    const r = await qprobe('http', 'GET', `http://localhost:${PORT}/api/users`)
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Alice')
    expect(out(r)).toContain('Bob')
    expect(out(r)).toContain('200')
  })

  test('POST with -d sends body', async () => {
    const r = await qprobe(
      'http', 'POST', `http://localhost:${PORT}/api/users`,
      '-d', '{"name":"Charlie"}',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Charlie')
    expect(out(r)).toContain('201')
  })

  test('PUT request', async () => {
    const r = await qprobe(
      'http', 'PUT', `http://localhost:${PORT}/api/users/1`,
      '-d', '{"name":"Updated"}',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Updated')
  })

  test('DELETE request', async () => {
    const r = await qprobe('http', 'DELETE', `http://localhost:${PORT}/api/users/1`)
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('204')
  })

  test('--status passes when matching', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/health`,
      '--status', '200',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('200')
  })

  test('--status fails when mismatching', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/nonexistent`,
      '--status', '200',
    )
    expect(r.exitCode).toBe(1)
    expect(out(r)).toContain('Expected 200')
    expect(out(r)).toContain('404')
  })

  test('--status 404 for intentional not found', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/nonexistent`,
      '--status', '404',
    )
    expect(r.exitCode).toBe(0)
  })

  test('--status 500 for server error', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/error`,
      '--status', '500',
    )
    expect(r.exitCode).toBe(0)
  })

  test('--jq filters response', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/nested`,
      '--jq', 'data.total',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('2')
  })

  test('--jq with nested path', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/nested`,
      '--jq', 'data.items[0].name',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('first')
  })

  test('--verbose shows request/response headers', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/health`,
      '-v',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('GET')
    expect(out(r)).toContain('200')
  })

  test('--token sets Bearer header', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/echo-headers`,
      '--token', 'mytoken123',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Bearer mytoken123')
  })

  test('-H sets custom header', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/echo-headers`,
      '-H', 'X-Custom:hello-world',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('hello-world')
  })

  test('--raw outputs without formatting', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/health`,
      '--raw',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('ok')
  })

  test('connection error fails gracefully', async () => {
    const r = await qprobe('http', 'GET', 'http://localhost:19999/nope')
    expect(r.exitCode).toBe(1)
  })

  test('--timing shows duration', async () => {
    const r = await qprobe(
      'http', 'GET', `http://localhost:${PORT}/api/health`,
      '--timing',
    )
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('Total:')
    expect(out(r)).toMatch(/\d+ms/)
  })
})

// ═══════════════════════════════════════════════
// CHECK COMMAND
// ═══════════════════════════════════════════════
describe('qprobe check', () => {
  const PORT = 14570

  beforeAll(async () => {
    const r = await qprobe(
      'start', 'check-srv', `bun run ${FIXTURE}`,
      '--ready', 'ready on', '--port', String(PORT), '--env', `PORT=${PORT}`, '--timeout', '10s',
    )
    if (r.exitCode !== 0) throw new Error(`start failed: ${out(r)}`)
  })

  afterAll(async () => {
    await qprobe('stop', 'check-srv')
  })

  test('reports HTTP status for healthy server', async () => {
    const r = await qprobe('check', `http://localhost:${PORT}/api/health`)
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('200')
    expect(out(r)).toContain('Checking')
  })

  test('reports running services count', async () => {
    const r = await qprobe('check', `http://localhost:${PORT}/api/health`)
    expect(out(r)).toContain('service(s) running')
    expect(out(r)).toContain('check-srv')
  })

  test('reports connection failure for bad URL', async () => {
    const r = await qprobe('check', 'http://localhost:19999/nope')
    expect(r.exitCode).toBe(0) // check doesn't exit non-zero for connection failures
    expect(out(r)).toContain('Connection failed')
  })

  test('reports non-2xx as error', async () => {
    const r = await qprobe('check', `http://localhost:${PORT}/api/error`)
    expect(out(r)).toContain('500')
  })
})
