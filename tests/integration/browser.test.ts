import { describe, expect, test } from 'bun:test'

async function qprobe(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', 'run', 'src/cli.ts', ...args], {
    env: { ...process.env, NO_COLOR: '1', CONSOLA_LEVEL: '999' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}

function out(r: { stdout: string; stderr: string }): string {
  return r.stdout + r.stderr
}

describe('qprobe browser CLI routing', () => {
  // These tests verify that subcommands are properly wired up (not "not yet implemented").
  // They'll fail with agent-browser errors, but that proves the routing works.

  test('browser open without URL shows error (not "not implemented")', async () => {
    const r = await qprobe('browser', 'open')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser snapshot routes to driver', async () => {
    const r = await qprobe('browser', 'snapshot')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser click routes to driver', async () => {
    const r = await qprobe('browser', 'click', '@e1')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser fill routes to driver', async () => {
    const r = await qprobe('browser', 'fill', '@e1', 'test')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser console routes to driver', async () => {
    const r = await qprobe('browser', 'console')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser errors routes to driver', async () => {
    const r = await qprobe('browser', 'errors')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser network routes to driver', async () => {
    const r = await qprobe('browser', 'network')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser screenshot routes to driver', async () => {
    const r = await qprobe('browser', 'screenshot')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser eval routes to driver', async () => {
    const r = await qprobe('browser', 'eval', '1+1')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser text routes to driver', async () => {
    const r = await qprobe('browser', 'text')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser dblclick routes to driver', async () => {
    const r = await qprobe('browser', 'dblclick', '@e1')
    expect(out(r)).not.toContain('not yet implemented')
  })

  test('browser scroll routes to driver', async () => {
    const r = await qprobe('browser', 'scroll', 'down')
    expect(out(r)).not.toContain('not yet implemented')
  })
})
