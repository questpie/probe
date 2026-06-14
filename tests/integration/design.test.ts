import { describe, expect, test } from 'bun:test'
import { execFile } from 'node:child_process'

function qprobe(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = execFile(
      'bun',
      ['run', 'src/cli.ts', ...args],
      {
        env: { ...process.env, NO_COLOR: '1', CONSOLA_LEVEL: '999' },
        timeout: 30_000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        let exitCode = 0
        if (error) {
          exitCode = typeof error.code === 'number' ? error.code : (child.exitCode ?? 1)
        }
        resolve({ stdout: stdout ?? '', stderr: stderr ?? '', exitCode })
      },
    )
  })
}

function out(r: { stdout: string; stderr: string }): string {
  return r.stdout + r.stderr
}

// Browser-launching behaviour is covered by manual dogfooding (it needs the
// Chromium binary); these keep the command wired and its contract stable.
describe('qprobe design CLI routing', () => {
  test('design is a wired subcommand with usage', async () => {
    const r = await qprobe('design', '--help')
    expect(out(r)).toContain('Measure the rendered UI')
    expect(out(r)).not.toContain('Unknown command')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('design rejects an empty viewport list before launching a browser', async () => {
    const r = await qprobe('design', 'http://127.0.0.1:1', '--viewport', ' ')
    expect(out(r)).toContain('No valid viewport widths')
    expect(r.exitCode).not.toBe(0)
  })
})
