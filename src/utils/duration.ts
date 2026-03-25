const UNITS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

export function parseDuration(input: string): number {
  const match = input.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/)
  if (!match) throw new Error(`Invalid duration: "${input}"`)
  const value = Number(match[1])
  const unit = UNITS[match[2]!]!
  return Math.round(value * unit)
}

export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`
  if (ms < 3_600_000) {
    const m = Math.floor(ms / 60_000)
    const s = Math.floor((ms % 60_000) / 1_000)
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
