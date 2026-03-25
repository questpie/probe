import { readFile, stat } from 'node:fs/promises'
import { watch } from 'chokidar'
import { consola } from 'consola'
import { getLogPath, listProcessNames } from './state'

export interface LogFilter {
  grep?: string
  level?: string
  lines?: number
  since?: number
  json?: boolean
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
}

function parseLine(line: string, source?: string): LogEntry | null {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(INFO|ERROR|WARN|DEBUG)\s+(.*)$/)
  if (!match) return null
  return {
    timestamp: match[1]!,
    level: match[2]!,
    message: match[3]!,
    source,
  }
}

function matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (filter.level && entry.level.toLowerCase() !== filter.level.toLowerCase()) return false
  if (filter.grep) {
    const regex = new RegExp(filter.grep, 'i')
    if (!regex.test(entry.message)) return false
  }
  if (filter.since) {
    const entryTime = new Date(entry.timestamp).getTime()
    const cutoff = Date.now() - filter.since
    if (entryTime < cutoff) return false
  }
  return true
}

export async function readLogs(name: string, filter: LogFilter = {}): Promise<LogEntry[]> {
  const logPath = getLogPath(name)
  let content: string
  try {
    content = await readFile(logPath, 'utf-8')
  } catch {
    return []
  }

  const lines = content.trim().split('\n')
  const entries: LogEntry[] = []

  for (const line of lines) {
    const entry = parseLine(line, name)
    if (entry && matchesFilter(entry, filter)) {
      entries.push(entry)
    }
  }

  const limit = filter.lines ?? 50
  return entries.slice(-limit)
}

export async function readAllLogs(filter: LogFilter = {}): Promise<LogEntry[]> {
  const names = await listProcessNames()
  const allEntries: LogEntry[] = []

  for (const name of names) {
    const entries = await readLogs(name, { ...filter, lines: undefined })
    allEntries.push(...entries)
  }

  allEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const limit = filter.lines ?? 50
  return allEntries.slice(-limit)
}

export async function followLogs(
  name: string,
  filter: LogFilter,
  signal: AbortSignal,
): Promise<void> {
  const logPath = getLogPath(name)

  let fileSize = 0
  try {
    const s = await stat(logPath)
    fileSize = s.size
  } catch {
    // file doesn't exist yet, start from 0
  }

  const existing = await readLogs(name, filter)
  for (const entry of existing) {
    printEntry(entry)
  }

  const watcher = watch(logPath, { persistent: true })

  const onChange = async () => {
    try {
      const content = await readFile(logPath, 'utf-8')
      const newContent = content.slice(fileSize)
      fileSize = content.length

      const lines = newContent.trim().split('\n')
      for (const line of lines) {
        const entry = parseLine(line, name)
        if (entry && matchesFilter(entry, filter)) {
          printEntry(entry)
        }
      }
    } catch {
      // file may not exist yet
    }
  }

  watcher.on('change', onChange)
  watcher.on('add', onChange)

  signal.addEventListener('abort', () => {
    void watcher.close()
  })
}

function printEntry(entry: LogEntry): void {
  const prefix = entry.source ? `[${entry.source}] ` : ''
  const levelColor =
    entry.level === 'ERROR' ? '\x1b[31m' : entry.level === 'WARN' ? '\x1b[33m' : '\x1b[0m'
  consola.log(`${prefix}${entry.timestamp} ${levelColor}${entry.level}\x1b[0m ${entry.message}`)
}
