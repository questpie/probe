import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ProcessRecord } from '../../src/core/registry'
import { resetSessionCache, sessionPaths, sharedPaths } from '../../src/core/session'
import type { ProcessState } from '../../src/core/state'

// Capture the output helpers by mocking the module. Under `bun test`, consola's
// own reporters don't reliably intercept output, so we stub the helpers `ps`
// uses (info/json/table) and assert on the calls instead.
const outCalls: { fn: 'info' | 'json' | 'table'; arg: unknown }[] = []
mock.module('../../src/utils/output', () => ({
  info: (msg: string) => outCalls.push({ fn: 'info', arg: msg }),
  json: (data: unknown) => outCalls.push({ fn: 'json', arg: data }),
  table: (rows: unknown) => outCalls.push({ fn: 'table', arg: rows }),
}))

// Imported after the mock so `ps` binds to the stubbed helpers.
const { default: psCommand, buildPsRows } = await import('../../src/commands/ps')

// biome-ignore lint/suspicious/noExplicitAny: citty command run signature is loose here
type RunnableCommand = { run: (ctx: { args: any }) => Promise<unknown> }

const ALIVE_PID = process.pid
const CURRENT_SESSION = 'ps-current'

let root: string
let prevRootDir: string | undefined
let prevSession: string | undefined

/** Flatten captured output calls into a single searchable string. */
function rendered(): string {
  return outCalls.map((c) => (typeof c.arg === 'string' ? c.arg : JSON.stringify(c.arg))).join('\n')
}

/** The argument passed to the first `table(...)` call, if any. */
function tableRows(): Record<string, unknown>[] | undefined {
  const call = outCalls.find((c) => c.fn === 'table')
  return call?.arg as Record<string, unknown>[] | undefined
}

/** The argument passed to the first `json(...)` call, if any. */
function jsonArg(): unknown {
  return outCalls.find((c) => c.fn === 'json')?.arg
}

function makeState(name: string, pid: number, extra?: Partial<ProcessState>): ProcessState {
  return {
    name,
    cmd: `run ${name}`,
    pid,
    startedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  }
}

async function writeProc(
  scope: { pids: string; state: string },
  name: string,
  pid: number,
  extra?: Partial<ProcessState>,
): Promise<void> {
  await mkdir(scope.pids, { recursive: true })
  await mkdir(scope.state, { recursive: true })
  await writeFile(join(scope.pids, `${name}.pid`), String(pid), 'utf-8')
  await writeFile(
    join(scope.state, `${name}.json`),
    JSON.stringify(makeState(name, pid, extra), null, 2),
    'utf-8',
  )
}

function record(name: string, session: string, port?: number): ProcessRecord {
  return { name, pid: 1, port, status: 'running', uptime: '1s', session }
}

beforeAll(() => {
  prevRootDir = process.env.QPROBE_ROOT_DIR
  prevSession = process.env.QPROBE_SESSION
})

beforeEach(async () => {
  root = join(tmpdir(), `qprobe-ps-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  process.env.QPROBE_ROOT_DIR = root
  process.env.QPROBE_SESSION = CURRENT_SESSION
  resetSessionCache()
  await rm(root, { recursive: true, force: true })
  outCalls.length = 0
})

afterEach(() => {
  outCalls.length = 0
})

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true })
  if (prevRootDir === undefined) {
    // biome-ignore lint/performance/noDelete: test env cleanup
    delete process.env.QPROBE_ROOT_DIR
  } else {
    process.env.QPROBE_ROOT_DIR = prevRootDir
  }
  if (prevSession === undefined) {
    // biome-ignore lint/performance/noDelete: test env cleanup
    delete process.env.QPROBE_SESSION
  } else {
    process.env.QPROBE_SESSION = prevSession
  }
  resetSessionCache()
})

const cmd = psCommand as unknown as RunnableCommand

describe('buildPsRows', () => {
  test('omits the session column by default', () => {
    const rows = buildPsRows([record('web', CURRENT_SESSION, 3000)], false)
    expect(rows).toHaveLength(1)
    expect(rows[0]).not.toHaveProperty('session')
    expect(rows[0]).toMatchObject({ name: 'web', pid: 1, port: 3000, status: 'running' })
  })

  test('includes the session column when all=true', () => {
    const rows = buildPsRows([record('web', 'alpha', 3000), record('db', 'shared')], true)
    expect(rows[0]).toHaveProperty('session', 'alpha')
    expect(rows[1]).toMatchObject({ name: 'db', session: 'shared' })
  })

  test('renders a missing port as an em dash', () => {
    const rows = buildPsRows([record('db', 'shared')], false)
    expect(rows[0]?.port).toBe('—')
  })
})

describe('ps command (default, current session only)', () => {
  test('lists only the current-session processes and prints the session header', async () => {
    await writeProc(sessionPaths(CURRENT_SESSION, { rootDir: root }), 'web', ALIVE_PID, {
      port: 3000,
    })
    await writeProc(sessionPaths('other', { rootDir: root }), 'api', ALIVE_PID, { port: 4000 })
    await writeProc(sharedPaths({ rootDir: root }), 'db', ALIVE_PID, { port: 5432 })

    await cmd.run({ args: { json: false, all: false } })

    expect(rendered()).toContain(`Session: ${CURRENT_SESSION}`)

    const rows = tableRows() ?? []
    const names = rows.map((r) => r.name)
    expect(names).toContain('web')
    expect(names).not.toContain('api')
    expect(names).not.toContain('db')
    // default table rows carry no session column
    expect(rows.every((r) => !('session' in r))).toBe(true)
  })

  test('empty state names the session', async () => {
    await cmd.run({ args: { json: false, all: false } })
    expect(rendered()).toContain(`No processes running in session ${CURRENT_SESSION}`)
  })

  test('json output is pure (no session header line)', async () => {
    await writeProc(sessionPaths(CURRENT_SESSION, { rootDir: root }), 'web', ALIVE_PID, {
      port: 3000,
    })

    await cmd.run({ args: { json: true, all: false } })

    // no info() header was emitted in JSON mode
    expect(outCalls.some((c) => c.fn === 'info')).toBe(false)
    const data = jsonArg() as Array<{ name: string }>
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]?.name).toBe('web')
  })
})

describe('ps command (--all, cross-session)', () => {
  test('lists processes from multiple sessions plus shared with session column', async () => {
    await writeProc(sessionPaths(CURRENT_SESSION, { rootDir: root }), 'web', ALIVE_PID, {
      port: 3000,
    })
    await writeProc(sessionPaths('other', { rootDir: root }), 'api', ALIVE_PID, { port: 4000 })
    await writeProc(sharedPaths({ rootDir: root }), 'db', ALIVE_PID, { port: 5432 })

    await cmd.run({ args: { json: false, all: true } })

    const rows = tableRows() ?? []
    const byName = new Map(rows.map((r) => [r.name, r]))
    expect(byName.get('web')?.session).toBe(CURRENT_SESSION)
    expect(byName.get('api')?.session).toBe('other')
    expect(byName.get('db')?.session).toBe('shared')
    // every row carries a session column in --all mode
    expect(rows.every((r) => 'session' in r)).toBe(true)
  })

  test('json output includes the session field for each record', async () => {
    await writeProc(sessionPaths(CURRENT_SESSION, { rootDir: root }), 'web', ALIVE_PID, {
      port: 3000,
    })
    await writeProc(sessionPaths('other', { rootDir: root }), 'api', ALIVE_PID, { port: 4000 })
    await writeProc(sharedPaths({ rootDir: root }), 'db', ALIVE_PID, { port: 5432 })

    await cmd.run({ args: { json: true, all: true } })

    const data = jsonArg() as ProcessRecord[]
    const byName = new Map(data.map((p) => [p.name, p]))
    expect(byName.get('web')?.session).toBe(CURRENT_SESSION)
    expect(byName.get('api')?.session).toBe('other')
    expect(byName.get('db')?.session).toBe('shared')
  })

  test('empty state across all sessions', async () => {
    await cmd.run({ args: { json: false, all: true } })
    const out = rendered()
    expect(out).toContain('No processes running')
    expect(out).not.toContain('in session')
  })
})
