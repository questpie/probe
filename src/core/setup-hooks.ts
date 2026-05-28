import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { x } from 'tinyexec'
import { currentSessionPaths, currentSharedPaths } from './session'
import type { Scope } from './state'

/** Executes a single setup command. Injectable for tests. */
export type SetupExec = (command: string) => Promise<void>

export interface RunSetupOptions {
  scope?: Scope
  vars?: Record<string, string>
  exec?: SetupExec
}

/**
 * Substitute `${KEY}` placeholders from `vars`. Unknown placeholders are left
 * verbatim so typos surface instead of silently becoming empty strings.
 */
export function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(/\$\{(\w+)\}/g, (match, key: string) =>
    key in vars ? (vars[key] as string) : match,
  )
}

function markerPath(name: string, scope: Scope): string {
  const stateDir = scope === 'shared' ? currentSharedPaths().state : currentSessionPaths().state
  return join(stateDir, `${name}.setup`)
}

/** Whether setup has already completed for this service in the given scope. */
export async function hasRunSetup(name: string, scope: Scope = 'session'): Promise<boolean> {
  try {
    await stat(markerPath(name, scope))
    return true
  } catch {
    return false
  }
}

export async function markSetupDone(name: string, scope: Scope = 'session'): Promise<void> {
  const file = markerPath(name, scope)
  const stateDir = scope === 'shared' ? currentSharedPaths().state : currentSessionPaths().state
  await mkdir(stateDir, { recursive: true })
  await writeFile(file, new Date().toISOString(), 'utf-8')
}

export async function clearSetupMarker(name: string, scope: Scope = 'session'): Promise<void> {
  await rm(markerPath(name, scope), { force: true })
}

const defaultExec: SetupExec = async (command) => {
  await x('sh', ['-c', command], { throwOnError: true })
}

/**
 * Run a service's setup commands exactly once per scope. If the marker already
 * exists, returns `[]` without running anything. Otherwise interpolates each
 * command, runs them in order, writes the marker, and returns the commands run.
 */
export async function runSetup(
  name: string,
  commands: string[],
  opts: RunSetupOptions = {},
): Promise<string[]> {
  const scope = opts.scope ?? 'session'
  if (await hasRunSetup(name, scope)) return []

  const exec = opts.exec ?? defaultExec
  const vars = opts.vars ?? {}
  const resolved = commands.map((c) => interpolate(c, vars))
  for (const cmd of resolved) {
    await exec(cmd)
  }
  await markSetupDone(name, scope)
  return resolved
}
