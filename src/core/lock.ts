import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isProcessAlive } from './process-manager'
import { currentSessionPaths, currentSharedPaths } from './session'
import type { Scope } from './state'

/**
 * Best-effort advisory file lock to stop two concurrent `compose up` runs in the
 * same scope from double-spawning. The lock records the holder PID; a lock whose
 * holder is no longer alive is treated as stale and taken over.
 */
export interface LockHandle {
  path: string
  release: () => Promise<void>
}

interface LockData {
  pid: number
  at: string
}

function scopeBase(scope: Scope): string {
  return scope === 'shared' ? currentSharedPaths().base : currentSessionPaths().base
}

function lockPath(name: string, scope: Scope): string {
  return join(scopeBase(scope), `${name}.lock`)
}

async function readLock(path: string): Promise<LockData | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as LockData
  } catch {
    return null
  }
}

function makeHandle(path: string): LockHandle {
  return {
    path,
    release: async () => {
      await rm(path, { force: true })
    },
  }
}

/**
 * Try to acquire the named lock. Returns a handle on success, or `null` if a
 * live process already holds it. A stale lock (dead holder) is taken over.
 */
export async function acquireLock(
  name: string,
  scope: Scope = 'session',
): Promise<LockHandle | null> {
  const path = lockPath(name, scope)
  await mkdir(scopeBase(scope), { recursive: true })
  const data = JSON.stringify({ pid: process.pid, at: new Date().toISOString() } satisfies LockData)

  try {
    await writeFile(path, data, { flag: 'wx' })
    return makeHandle(path)
  } catch {
    // Lock file exists — decide if it is stale.
    const holder = await readLock(path)
    if (holder && isProcessAlive(holder.pid)) return null

    await rm(path, { force: true })
    try {
      await writeFile(path, data, { flag: 'wx' })
      return makeHandle(path)
    } catch {
      return null // lost a race to another taker
    }
  }
}

/** Whether the named lock is currently held by a live process. */
export async function isLocked(name: string, scope: Scope = 'session'): Promise<boolean> {
  const holder = await readLock(lockPath(name, scope))
  return holder !== null && isProcessAlive(holder.pid)
}

/** Run `fn` while holding the named lock; always releases. Throws if held. */
export async function withLock<T>(
  name: string,
  fn: () => Promise<T>,
  scope: Scope = 'session',
): Promise<T> {
  const handle = await acquireLock(name, scope)
  if (!handle) {
    throw new Error(
      `Could not acquire the "${name}" lock — another process is already running it. Wait for it to finish, or remove the stale lock file if no process is running.`,
    )
  }
  try {
    return await fn()
  } finally {
    await handle.release()
  }
}
