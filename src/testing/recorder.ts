import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadProbeConfig } from '../core/config'

export interface RecordedAction {
  command: string
  args: string[]
  timestamp: string
}

export interface Recording {
  name: string
  startedAt: string
  finishedAt?: string
  baseUrl?: string
  actions: RecordedAction[]
}

const STATE_FILE = 'tmp/qprobe/state/recording.json'

let activeRecording: Recording | null = null

export async function startRecording(name: string): Promise<void> {
  // Check disk first — each CLI call is a separate process
  const existing = activeRecording ?? await loadActiveRecording()
  if (existing) {
    const startedAt = new Date(existing.startedAt)
    const elapsed = Date.now() - startedAt.getTime()
    const mins = Math.floor(elapsed / 60_000)
    const age = mins > 0 ? ` (started ${mins}m ago)` : ''
    throw new Error(
      `Already recording "${existing.name}"${age}. Run "qprobe record stop" or "qprobe record cancel" first.`
    )
  }

  const config = await loadProbeConfig()
  activeRecording = {
    name,
    startedAt: new Date().toISOString(),
    baseUrl: config.http?.baseUrl ?? config.browser?.baseUrl,
    actions: [],
  }

  await mkdir('tmp/qprobe/state', { recursive: true })
  await writeFile(STATE_FILE, JSON.stringify(activeRecording, null, 2), 'utf-8')
}

export function recordAction(command: string, args: string[]): void {
  // Load from disk if not in memory (each CLI call is a separate process)
  if (!activeRecording) {
    try {
      const content = readFileSync(STATE_FILE, 'utf-8')
      activeRecording = JSON.parse(content) as Recording
    } catch {
      return // no active recording
    }
  }
  activeRecording.actions.push({
    command,
    args,
    timestamp: new Date().toISOString(),
  })
  void writeFile(STATE_FILE, JSON.stringify(activeRecording, null, 2), 'utf-8')
}

export async function stopRecording(): Promise<Recording> {
  const recording = activeRecording ?? await loadActiveRecording()
  if (!recording) throw new Error('No active recording')

  recording.finishedAt = new Date().toISOString()

  const config = await loadProbeConfig()
  const testsDir = config.tests?.dir ?? 'tests/qprobe'
  const recordingsDir = join(testsDir, 'recordings')
  await mkdir(recordingsDir, { recursive: true })

  const jsonPath = join(recordingsDir, `${recording.name}.json`)
  await writeFile(jsonPath, JSON.stringify(recording, null, 2), 'utf-8')

  activeRecording = null
  try {
    const { rm } = await import('node:fs/promises')
    await rm(STATE_FILE)
  } catch {
    // ignore
  }

  return recording
}

export async function cancelRecording(): Promise<void> {
  activeRecording = null
  try {
    const { rm } = await import('node:fs/promises')
    await rm(STATE_FILE)
  } catch {
    // ignore
  }
}

export async function isRecording(): Promise<boolean> {
  if (activeRecording) return true
  const loaded = await loadActiveRecording()
  return loaded !== null
}

async function loadActiveRecording(): Promise<Recording | null> {
  try {
    const content = await readFile(STATE_FILE, 'utf-8')
    activeRecording = JSON.parse(content) as Recording
    return activeRecording
  } catch {
    return null
  }
}

export async function getActiveRecording(): Promise<Recording | null> {
  if (activeRecording) return activeRecording
  return loadActiveRecording()
}
