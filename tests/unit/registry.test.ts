import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  findProcess,
  listProcessNamesIn,
  listProcessesAcrossSessions,
  listSessions,
} from '../../src/core/registry'
import { sessionPaths, sharedPaths } from '../../src/core/session'
import type { ProcessState } from '../../src/core/state'

const ALIVE_PID = process.pid
const DEAD_PID = 999999

let root: string
let prevRootDir: string | undefined

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

beforeAll(() => {
  prevRootDir = process.env.QPROBE_ROOT_DIR
})

beforeEach(async () => {
  root = join(tmpdir(), `qprobe-registry-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  process.env.QPROBE_ROOT_DIR = root
  await rm(root, { recursive: true, force: true })
})

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true })
  if (prevRootDir === undefined) {
    // biome-ignore lint/performance/noDelete: test env cleanup
    delete process.env.QPROBE_ROOT_DIR
  } else {
    process.env.QPROBE_ROOT_DIR = prevRootDir
  }
})

describe('listSessions', () => {
  test('returns [] when sessions dir is absent', async () => {
    expect(await listSessions()).toEqual([])
  })

  test('returns created session ids and excludes shared', async () => {
    await writeProc(sessionPaths('alpha', { rootDir: root }), 'web', ALIVE_PID)
    await writeProc(sessionPaths('beta', { rootDir: root }), 'api', ALIVE_PID)
    await writeProc(sharedPaths({ rootDir: root }), 'db', ALIVE_PID)

    const sessions = await listSessions()
    expect(sessions.sort()).toEqual(['alpha', 'beta'])
    expect(sessions).not.toContain('shared')
  })
})

describe('listProcessNamesIn', () => {
  test('reads .pid file names from a pids dir', async () => {
    const paths = sessionPaths('alpha', { rootDir: root })
    await writeProc(paths, 'web', ALIVE_PID)
    await writeProc(paths, 'worker', ALIVE_PID)

    const names = await listProcessNamesIn(paths.pids)
    expect(names.sort()).toEqual(['web', 'worker'])
  })

  test('returns [] for missing dir', async () => {
    expect(await listProcessNamesIn(join(root, 'nope'))).toEqual([])
  })
})

describe('listProcessesAcrossSessions', () => {
  test('aggregates processes from multiple sessions and shared, tagging session', async () => {
    await writeProc(sessionPaths('alpha', { rootDir: root }), 'web', ALIVE_PID, { port: 3000 })
    await writeProc(sessionPaths('beta', { rootDir: root }), 'api', ALIVE_PID, { port: 4000 })
    await writeProc(sharedPaths({ rootDir: root }), 'db', ALIVE_PID, { port: 5432 })

    const procs = await listProcessesAcrossSessions()
    const byName = new Map(procs.map((p) => [p.name, p]))

    expect(byName.get('web')?.session).toBe('alpha')
    expect(byName.get('api')?.session).toBe('beta')
    expect(byName.get('db')?.session).toBe('shared')
    expect(byName.get('web')?.port).toBe(3000)
    for (const p of procs) {
      expect(p.status).toBe('running')
      expect(typeof p.uptime).toBe('string')
    }
  })

  test('excludes dead processes and prunes their pid + state files', async () => {
    const alpha = sessionPaths('alpha', { rootDir: root })
    await writeProc(alpha, 'alive', ALIVE_PID)
    await writeProc(alpha, 'dead', DEAD_PID)

    const procs = await listProcessesAcrossSessions()
    const names = procs.map((p) => p.name)
    expect(names).toContain('alive')
    expect(names).not.toContain('dead')

    // dead pid + state files pruned
    expect(existsSync(join(alpha.pids, 'dead.pid'))).toBe(false)
    expect(existsSync(join(alpha.state, 'dead.json'))).toBe(false)
    // alive untouched
    expect(existsSync(join(alpha.pids, 'alive.pid'))).toBe(true)
    expect(existsSync(join(alpha.state, 'alive.json'))).toBe(true)
  })

  test('returns [] when nothing exists', async () => {
    expect(await listProcessesAcrossSessions()).toEqual([])
  })
})

describe('findProcess', () => {
  test('finds a shared process', async () => {
    await writeProc(sharedPaths({ rootDir: root }), 'db', ALIVE_PID, { port: 5432 })
    const found = await findProcess('db')
    expect(found?.session).toBe('shared')
    expect(found?.port).toBe(5432)
  })

  test('finds a session process', async () => {
    await writeProc(sessionPaths('beta', { rootDir: root }), 'api', ALIVE_PID)
    const found = await findProcess('api')
    expect(found?.name).toBe('api')
    expect(found?.session).toBe('beta')
  })

  test('returns null for unknown name', async () => {
    await writeProc(sessionPaths('alpha', { rootDir: root }), 'web', ALIVE_PID)
    expect(await findProcess('ghost')).toBeNull()
  })

  test('ignores a dead match', async () => {
    await writeProc(sessionPaths('alpha', { rootDir: root }), 'web', DEAD_PID)
    expect(await findProcess('web')).toBeNull()
  })
})
