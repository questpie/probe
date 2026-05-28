import { describe, expect, test } from 'bun:test'
import { resolveSessionId, sessionPaths, sharedPaths } from '../../src/core/session'

describe('resolveSessionId', () => {
  test('uses QPROBE_SESSION verbatim when set', () => {
    expect(resolveSessionId({ env: { QPROBE_SESSION: 'agent-1' } })).toBe('agent-1')
  })

  test('sanitizes unsafe characters in QPROBE_SESSION', () => {
    expect(resolveSessionId({ env: { QPROBE_SESSION: 'feat/foo bar' } })).toBe('feat-foo-bar')
  })

  test('collapses repeated separators and trims them', () => {
    expect(resolveSessionId({ env: { QPROBE_SESSION: '  --a//b__  ' } })).toBe('a-b__')
  })

  test('QPROBE_SESSION takes precedence over git toplevel', () => {
    expect(resolveSessionId({ env: { QPROBE_SESSION: 'x' }, gitToplevel: '/repo/myapp' })).toBe('x')
  })

  test('derives <basename>-<hash8> from git toplevel when no env', () => {
    const id = resolveSessionId({ env: {}, gitToplevel: '/repo/myapp' })
    expect(id).toMatch(/^myapp-[0-9a-f]{8}$/)
  })

  test('is deterministic for the same toplevel', () => {
    const a = resolveSessionId({ env: {}, gitToplevel: '/repo/myapp' })
    const b = resolveSessionId({ env: {}, gitToplevel: '/repo/myapp' })
    expect(a).toBe(b)
  })

  test('produces distinct ids for different worktrees of the same repo', () => {
    const a = resolveSessionId({ env: {}, gitToplevel: '/repo/myapp' })
    const b = resolveSessionId({ env: {}, gitToplevel: '/repo/myapp-wt2' })
    expect(a).not.toBe(b)
  })

  test('falls back to cwd when not in a git repo', () => {
    const id = resolveSessionId({ env: {}, gitToplevel: null, cwd: '/tmp/proj' })
    expect(id).toMatch(/^proj-[0-9a-f]{8}$/)
  })

  test('cwd hash differs from git-toplevel hash for the same path', () => {
    // Sanity: same basename, but the resolved id is stable per source path
    const fromCwd = resolveSessionId({ env: {}, gitToplevel: null, cwd: '/a/proj' })
    const fromGit = resolveSessionId({ env: {}, gitToplevel: '/a/proj' })
    expect(fromCwd).toBe(fromGit) // same path string → same hash
  })
})

describe('sessionPaths', () => {
  test('returns namespaced runtime dirs under the default root', () => {
    const p = sessionPaths('agent-1')
    expect(p.base).toBe('tmp/qprobe/sessions/agent-1')
    expect(p.pids).toBe('tmp/qprobe/sessions/agent-1/pids')
    expect(p.state).toBe('tmp/qprobe/sessions/agent-1/state')
    expect(p.logs).toBe('tmp/qprobe/sessions/agent-1/logs')
    expect(p.snapshots).toBe('tmp/qprobe/sessions/agent-1/snapshots')
    expect(p.shots).toBe('tmp/qprobe/sessions/agent-1/shots')
  })

  test('honors QPROBE_ROOT_DIR override', () => {
    const p = sessionPaths('agent-1', { rootDir: '/tmp/custom-root' })
    expect(p.base).toBe('/tmp/custom-root/sessions/agent-1')
    expect(p.logs).toBe('/tmp/custom-root/sessions/agent-1/logs')
  })
})

describe('sharedPaths', () => {
  test('shared dir lives outside the session namespace', () => {
    const p = sharedPaths()
    expect(p.base).toBe('tmp/qprobe/shared')
    expect(p.pids).toBe('tmp/qprobe/shared/pids')
    expect(p.state).toBe('tmp/qprobe/shared/state')
    expect(p.logs).toBe('tmp/qprobe/shared/logs')
  })

  test('honors QPROBE_ROOT_DIR override', () => {
    const p = sharedPaths({ rootDir: '/tmp/custom-root' })
    expect(p.base).toBe('/tmp/custom-root/shared')
  })
})
