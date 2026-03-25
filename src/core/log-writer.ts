import { appendFile } from 'node:fs/promises'
import { ensureLogsDir, getLogPath } from './state'

type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG'

function timestamp(): string {
  return new Date().toISOString()
}

function detectLevel(line: string): LogLevel {
  const lower = line.toLowerCase()
  if (lower.includes('error') || lower.includes('err ')) return 'ERROR'
  if (lower.includes('warn')) return 'WARN'
  if (lower.includes('debug')) return 'DEBUG'
  return 'INFO'
}

export async function writeLog(name: string, data: string, level?: LogLevel): Promise<void> {
  await ensureLogsDir()
  const logPath = getLogPath(name)
  const lines = data.split('\n').filter((l) => l.length > 0)
  const formatted = lines
    .map((line) => {
      const lvl = level ?? detectLevel(line)
      return `${timestamp()} ${lvl.padEnd(5)} ${line}`
    })
    .join('\n')

  if (formatted.length > 0) {
    await appendFile(logPath, `${formatted}\n`, 'utf-8')
  }
}

export function createLogWriter(name: string): {
  stdout: (chunk: Buffer | string) => void
  stderr: (chunk: Buffer | string) => void
} {
  return {
    stdout(chunk: Buffer | string) {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
      void writeLog(name, text)
    },
    stderr(chunk: Buffer | string) {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
      void writeLog(name, text, 'ERROR')
    },
  }
}
