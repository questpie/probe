import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'

/** Default root for all qprobe runtime state. Override with QPROBE_ROOT_DIR. */
export const DEFAULT_ROOT_DIR = 'tmp/qprobe'

export interface ResolveSessionOptions {
  /** Environment to read QPROBE_SESSION from. Defaults to process.env. */
  env?: Record<string, string | undefined>
  /** Current working directory used for the fallback hash. */
  cwd?: string
  /**
   * Git worktree root (`git rev-parse --show-toplevel`). Pass `null` to signal
   * "not a git repo" and force the cwd fallback. Injectable for tests.
   */
  gitToplevel?: string | null
}

export interface PathOptions {
  /** Root directory. Defaults to DEFAULT_ROOT_DIR. */
  rootDir?: string
}

export interface SessionPaths {
  base: string
  pids: string
  state: string
  logs: string
  snapshots: string
  shots: string
}

export interface SharedPaths {
  base: string
  pids: string
  state: string
  logs: string
}

/**
 * Make an arbitrary string safe to use as a directory name: keep
 * [A-Za-z0-9_-], turn every other run of characters into a single `-`, and
 * trim leading/trailing dashes. Underscores are preserved.
 */
function sanitize(input: string): string {
  return input
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hash8(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 8)
}

/**
 * Resolve a session id from explicit inputs (pure / deterministic).
 *
 * Precedence:
 *   1. `QPROBE_SESSION` env var (sanitized, used verbatim)
 *   2. auto-from-worktree: `<basename>-<sha256(toplevel).slice(0,8)>`
 *      using the git toplevel, falling back to `cwd` when not in git.
 */
export function resolveSessionId(opts: ResolveSessionOptions = {}): string {
  const env = opts.env ?? {}
  const explicit = env.QPROBE_SESSION ? sanitize(env.QPROBE_SESSION) : ''
  if (explicit) return explicit

  const sourcePath = opts.gitToplevel ?? opts.cwd ?? process.cwd()
  const name = sanitize(basename(sourcePath)) || 'session'
  return `${name}-${hash8(sourcePath)}`
}

/** Build the namespaced runtime paths for a given session id (pure). */
export function sessionPaths(id: string, opts: PathOptions = {}): SessionPaths {
  const root = opts.rootDir ?? DEFAULT_ROOT_DIR
  const base = join(root, 'sessions', id)
  return {
    base,
    pids: join(base, 'pids'),
    state: join(base, 'state'),
    logs: join(base, 'logs'),
    snapshots: join(base, 'snapshots'),
    shots: join(base, 'shots'),
  }
}

/**
 * Paths for shared (cross-session) services. These deliberately live OUTSIDE
 * the session namespace so multiple sessions can discover and reuse them.
 */
export function sharedPaths(opts: PathOptions = {}): SharedPaths {
  const root = opts.rootDir ?? DEFAULT_ROOT_DIR
  const base = join(root, 'shared')
  return {
    base,
    pids: join(base, 'pids'),
    state: join(base, 'state'),
    logs: join(base, 'logs'),
  }
}

/** Resolve the configured root dir, honoring QPROBE_ROOT_DIR. */
export function getRootDir(): string {
  return process.env.QPROBE_ROOT_DIR || DEFAULT_ROOT_DIR
}

function detectGitToplevel(cwd: string): string | null {
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    })
    const trimmed = out.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

let _sessionId: string | null = null

/** Resolve and cache the current session id for this CLI invocation. */
export function getSessionId(): string {
  if (_sessionId) return _sessionId
  const cwd = process.cwd()
  _sessionId = resolveSessionId({
    env: process.env,
    cwd,
    gitToplevel: detectGitToplevel(cwd),
  })
  return _sessionId
}

/** Namespaced paths for the current session (uses cached id + env root). */
export function currentSessionPaths(): SessionPaths {
  return sessionPaths(getSessionId(), { rootDir: getRootDir() })
}

/** Shared paths resolved against the env root. */
export function currentSharedPaths(): SharedPaths {
  return sharedPaths({ rootDir: getRootDir() })
}

/** Test helper: clear the cached session id. */
export function resetSessionCache(): void {
  _sessionId = null
}
