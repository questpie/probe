import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { currentSessionPaths, currentSharedPaths } from './session'

export interface ProcessState {
  name: string
  cmd: string
  pid: number
  port?: number
  ready?: string
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  startedAt: string
}

/**
 * Which storage scope a process lives in. `'session'` (default) is the current
 * session's namespace; `'shared'` is the cross-session shared scope used by
 * services flagged `shared: true`.
 */
export type Scope = 'session' | 'shared'

// Runtime dirs are resolved per call (not at module load) so QPROBE_SESSION /
// QPROBE_ROOT_DIR take effect for the current CLI invocation.
function dirs(scope: Scope = 'session'): { pids: string; state: string; logs: string } {
  const p = scope === 'shared' ? currentSharedPaths() : currentSessionPaths()
  return { pids: p.pids, state: p.state, logs: p.logs }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

export function getLogsDir(scope: Scope = 'session'): string {
  return dirs(scope).logs
}

export function getLogPath(name: string, scope: Scope = 'session'): string {
  return join(dirs(scope).logs, `${name}.log`)
}

export async function savePid(name: string, pid: number, scope: Scope = 'session'): Promise<void> {
  const dir = dirs(scope).pids
  await ensureDir(dir)
  await writeFile(join(dir, `${name}.pid`), String(pid), 'utf-8')
}

export async function readPid(name: string, scope: Scope = 'session'): Promise<number | null> {
  try {
    const content = await readFile(join(dirs(scope).pids, `${name}.pid`), 'utf-8')
    return Number.parseInt(content.trim(), 10)
  } catch {
    return null
  }
}

export async function removePid(name: string, scope: Scope = 'session'): Promise<void> {
  try {
    await rm(join(dirs(scope).pids, `${name}.pid`))
  } catch {
    // ignore
  }
}

export async function saveState(
  name: string,
  state: ProcessState,
  scope: Scope = 'session',
): Promise<void> {
  const dir = dirs(scope).state
  await ensureDir(dir)
  await writeFile(join(dir, `${name}.json`), JSON.stringify(state, null, 2), 'utf-8')
}

export async function readState(
  name: string,
  scope: Scope = 'session',
): Promise<ProcessState | null> {
  try {
    const content = await readFile(join(dirs(scope).state, `${name}.json`), 'utf-8')
    return JSON.parse(content) as ProcessState
  } catch {
    return null
  }
}

export async function removeState(name: string, scope: Scope = 'session'): Promise<void> {
  try {
    await rm(join(dirs(scope).state, `${name}.json`))
  } catch {
    // ignore
  }
}

export async function listProcessNames(scope: Scope = 'session'): Promise<string[]> {
  try {
    const files = await readdir(dirs(scope).pids)
    return files.filter((f) => f.endsWith('.pid')).map((f) => f.replace('.pid', ''))
  } catch {
    return []
  }
}

export async function ensureLogsDir(scope: Scope = 'session'): Promise<void> {
  await ensureDir(dirs(scope).logs)
}
