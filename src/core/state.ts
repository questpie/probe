import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BASE_DIR = 'tmp/qprobe'
const PIDS_DIR = join(BASE_DIR, 'pids')
const STATE_DIR = join(BASE_DIR, 'state')
const LOGS_DIR = join(BASE_DIR, 'logs')

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

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

export function getLogsDir(): string {
  return LOGS_DIR
}

export function getLogPath(name: string): string {
  return join(LOGS_DIR, `${name}.log`)
}

export async function savePid(name: string, pid: number): Promise<void> {
  await ensureDir(PIDS_DIR)
  await writeFile(join(PIDS_DIR, `${name}.pid`), String(pid), 'utf-8')
}

export async function readPid(name: string): Promise<number | null> {
  try {
    const content = await readFile(join(PIDS_DIR, `${name}.pid`), 'utf-8')
    return Number.parseInt(content.trim(), 10)
  } catch {
    return null
  }
}

export async function removePid(name: string): Promise<void> {
  try {
    await rm(join(PIDS_DIR, `${name}.pid`))
  } catch {
    // ignore
  }
}

export async function saveState(name: string, state: ProcessState): Promise<void> {
  await ensureDir(STATE_DIR)
  await writeFile(join(STATE_DIR, `${name}.json`), JSON.stringify(state, null, 2), 'utf-8')
}

export async function readState(name: string): Promise<ProcessState | null> {
  try {
    const content = await readFile(join(STATE_DIR, `${name}.json`), 'utf-8')
    return JSON.parse(content) as ProcessState
  } catch {
    return null
  }
}

export async function removeState(name: string): Promise<void> {
  try {
    await rm(join(STATE_DIR, `${name}.json`))
  } catch {
    // ignore
  }
}

export async function listProcessNames(): Promise<string[]> {
  try {
    const files = await readdir(PIDS_DIR)
    return files.filter((f) => f.endsWith('.pid')).map((f) => f.replace('.pid', ''))
  } catch {
    return []
  }
}

export async function ensureLogsDir(): Promise<void> {
  await ensureDir(LOGS_DIR)
}
