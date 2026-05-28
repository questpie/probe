import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { currentSessionPaths } from './session'

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

// Runtime dirs are resolved per call (not at module load) so QPROBE_SESSION /
// QPROBE_ROOT_DIR take effect for the current CLI invocation.
function pidsDir(): string {
  return currentSessionPaths().pids
}

function stateDir(): string {
  return currentSessionPaths().state
}

function logsDir(): string {
  return currentSessionPaths().logs
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

export function getLogsDir(): string {
  return logsDir()
}

export function getLogPath(name: string): string {
  return join(logsDir(), `${name}.log`)
}

export async function savePid(name: string, pid: number): Promise<void> {
  const dir = pidsDir()
  await ensureDir(dir)
  await writeFile(join(dir, `${name}.pid`), String(pid), 'utf-8')
}

export async function readPid(name: string): Promise<number | null> {
  try {
    const content = await readFile(join(pidsDir(), `${name}.pid`), 'utf-8')
    return Number.parseInt(content.trim(), 10)
  } catch {
    return null
  }
}

export async function removePid(name: string): Promise<void> {
  try {
    await rm(join(pidsDir(), `${name}.pid`))
  } catch {
    // ignore
  }
}

export async function saveState(name: string, state: ProcessState): Promise<void> {
  const dir = stateDir()
  await ensureDir(dir)
  await writeFile(join(dir, `${name}.json`), JSON.stringify(state, null, 2), 'utf-8')
}

export async function readState(name: string): Promise<ProcessState | null> {
  try {
    const content = await readFile(join(stateDir(), `${name}.json`), 'utf-8')
    return JSON.parse(content) as ProcessState
  } catch {
    return null
  }
}

export async function removeState(name: string): Promise<void> {
  try {
    await rm(join(stateDir(), `${name}.json`))
  } catch {
    // ignore
  }
}

export async function listProcessNames(): Promise<string[]> {
  try {
    const files = await readdir(pidsDir())
    return files.filter((f) => f.endsWith('.pid')).map((f) => f.replace('.pid', ''))
  } catch {
    return []
  }
}

export async function ensureLogsDir(): Promise<void> {
  await ensureDir(logsDir())
}
