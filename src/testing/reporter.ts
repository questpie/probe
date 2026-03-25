import type { ReplayResult } from './replayer'

export function formatReplayResult(result: ReplayResult): string {
  const lines: string[] = []

  if (result.exitCode === 0) {
    lines.push(`\u2705 All tests passed (${result.passed} passed)`)
  } else {
    lines.push(`\u274c Tests failed (${result.passed} passed, ${result.failed} failed)`)
  }

  if (result.output.trim()) {
    lines.push('')
    lines.push(result.output.trim())
  }

  return lines.join('\n')
}

export function formatRecordingsList(
  recordings: Array<{ name: string; actions: number; date: string }>,
): string {
  if (recordings.length === 0) return 'No recordings found'

  const lines: string[] = []
  lines.push('NAME                    ACTIONS  DATE')
  for (const r of recordings) {
    const name = r.name.padEnd(24)
    const actions = String(r.actions).padEnd(9)
    lines.push(`${name}${actions}${r.date}`)
  }
  return lines.join('\n')
}
