import { readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { formatDuration } from '../utils/duration'
import { type ProcessInfo, isProcessAlive } from './process-manager'
import { getRootDir, getSessionId, sessionPaths, sharedPaths } from './session'
import type { ProcessState } from './state'

/** Label used for the shared scope in cross-session listings. */
export const SHARED_SCOPE = 'shared'

/** A process record annotated with the session (or 'shared') it belongs to. */
export interface ProcessRecord extends ProcessInfo {
  session: string
}

/** A pids+state directory pair plus the session label that owns it. */
interface Scope {
  session: string
  pids: string
  state: string
}

/** List session ids that have a directory under `<root>/sessions/`. */
export async function listSessions(): Promise<string[]> {
  const dir = join(getRootDir(), 'sessions')
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

/** Read process names from a given pids directory (the `<name>.pid` files). */
export async function listProcessNamesIn(pidsDir: string): Promise<string[]> {
  try {
    const files = await readdir(pidsDir)
    return files.filter((f) => f.endsWith('.pid')).map((f) => f.replace(/\.pid$/, ''))
  } catch {
    return []
  }
}

async function readPidIn(pidsDir: string, name: string): Promise<number | null> {
  try {
    const content = await readFile(join(pidsDir, `${name}.pid`), 'utf-8')
    const pid = Number.parseInt(content.trim(), 10)
    return Number.isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

async function readStateIn(stateDir: string, name: string): Promise<ProcessState | null> {
  try {
    const content = await readFile(join(stateDir, `${name}.json`), 'utf-8')
    return JSON.parse(content) as ProcessState
  } catch {
    return null
  }
}

async function pruneIn(scope: Scope, name: string): Promise<void> {
  await rm(join(scope.pids, `${name}.pid`), { force: true })
  await rm(join(scope.state, `${name}.json`), { force: true })
}

/**
 * Resolve a process within a single scope. Returns the live record, or `null`
 * if missing/dead. Dead pid+state files are pruned as a side effect (mirrors
 * the behavior of process-manager's `listProcesses`).
 */
async function resolveInScope(scope: Scope, name: string): Promise<ProcessRecord | null> {
  const state = await readStateIn(scope.state, name)
  const pid = await readPidIn(scope.pids, name)
  if (!state || !pid) return null

  if (!isProcessAlive(pid)) {
    await pruneIn(scope, name)
    return null
  }

  const uptimeMs = Date.now() - new Date(state.startedAt).getTime()
  return {
    name: state.name,
    pid,
    port: state.port,
    status: 'running',
    uptime: formatDuration(uptimeMs),
    session: scope.session,
  }
}

/** Build the ordered list of scopes: every session plus the shared scope. */
async function allScopes(): Promise<Scope[]> {
  const rootDir = getRootDir()
  const sessions = await listSessions()
  const scopes: Scope[] = sessions.map((id) => {
    const paths = sessionPaths(id, { rootDir })
    return { session: id, pids: paths.pids, state: paths.state }
  })
  const shared = sharedPaths({ rootDir })
  scopes.push({ session: SHARED_SCOPE, pids: shared.pids, state: shared.state })
  return scopes
}

/**
 * Enumerate every process across all sessions and the shared scope. Each record
 * is tagged with its `session` (or 'shared'). Dead entries are pruned and
 * excluded from the result.
 */
export async function listProcessesAcrossSessions(): Promise<ProcessRecord[]> {
  const scopes = await allScopes()
  const result: ProcessRecord[] = []
  for (const scope of scopes) {
    const names = await listProcessNamesIn(scope.pids)
    for (const name of names) {
      const record = await resolveInScope(scope, name)
      if (record) result.push(record)
    }
  }
  return result
}

/**
 * Find a live process by name for reuse decisions. Precedence: the current
 * session first, then the shared scope, then any other session. Returns the
 * first live match (with its `session`), or `null`.
 */
export async function findProcess(name: string): Promise<ProcessRecord | null> {
  const rootDir = getRootDir()
  const currentId = getSessionId()

  const current = sessionPaths(currentId, { rootDir })
  const currentMatch = await resolveInScope(
    { session: currentId, pids: current.pids, state: current.state },
    name,
  )
  if (currentMatch) return currentMatch

  const shared = sharedPaths({ rootDir })
  const sharedMatch = await resolveInScope(
    { session: SHARED_SCOPE, pids: shared.pids, state: shared.state },
    name,
  )
  if (sharedMatch) return sharedMatch

  for (const id of await listSessions()) {
    if (id === currentId) continue
    const paths = sessionPaths(id, { rootDir })
    const match = await resolveInScope({ session: id, pids: paths.pids, state: paths.state }, name)
    if (match) return match
  }

  return null
}
