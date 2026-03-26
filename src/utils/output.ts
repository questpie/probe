import { consola } from 'consola'

export function success(msg: string): void {
  consola.success(msg)
}

export function error(msg: string): void {
  consola.error(msg)
}

export function warn(msg: string): void {
  consola.warn(msg)
}

export function info(msg: string): void {
  consola.info(msg)
}

export function log(msg: string): void {
  consola.log(msg)
}

export function hint(msg: string): void {
  consola.log(`  \x1b[2mHint: ${msg}\x1b[0m`)
}

export function errorWithHint(msg: string, hints: string[]): void {
  consola.error(msg)
  for (const h of hints) {
    consola.log(`  \x1b[2m> ${h}\x1b[0m`)
  }
}

export function table(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return
  const keys = Object.keys(rows[0]!)
  const widths = keys.map((k) => {
    const vals = rows.map((r) => String(r[k] ?? ''))
    return Math.max(k.length, ...vals.map((v) => v.length))
  })

  const header = keys.map((k, i) => k.toUpperCase().padEnd(widths[i]!)).join('  ')
  consola.log(header)
  for (const row of rows) {
    const line = keys.map((k, i) => String(row[k] ?? '').padEnd(widths[i]!)).join('  ')
    consola.log(line)
  }
}

export function json(data: unknown): void {
  consola.log(JSON.stringify(data, null, 2))
}
