import { x } from 'tinyexec'

/**
 * Portless integration. Portless (vercel-labs) replaces port numbers with stable
 * `*.localhost` URLs and is worktree-aware, which makes parallel agents/worktrees
 * stop fighting over ports. It is enabled by DEFAULT; opt out via
 * `session.portless: false` or `QPROBE_PORTLESS=0`.
 *
 * Graceful degradation: if portless is enabled but the binary is missing, we fall
 * back to the legacy localhost/port behavior with a warning — UNLESS the user
 * explicitly opted in via `QPROBE_PORTLESS=1`, in which case it is a hard error.
 */

export interface PortlessDecision {
  mode: 'use' | 'fallback' | 'error'
  reason?: string
}

export interface PortlessEnableOptions {
  /** The resolved `session.portless` config value (undefined = not set). */
  config?: boolean
  env?: Record<string, string | undefined>
}

/** Whether QPROBE_PORTLESS was explicitly set to a recognized on/off value. */
export function isPortlessExplicit(env: Record<string, string | undefined> = process.env): boolean {
  return env.QPROBE_PORTLESS === '0' || env.QPROBE_PORTLESS === '1'
}

/**
 * Resolve whether portless is enabled. `QPROBE_PORTLESS` (1/0) wins over config;
 * otherwise the config value, defaulting to ON.
 */
export function isPortlessEnabled(opts: PortlessEnableOptions = {}): boolean {
  const env = opts.env ?? process.env
  if (env.QPROBE_PORTLESS === '1') return true
  if (env.QPROBE_PORTLESS === '0') return false
  return opts.config ?? true
}

/** Wrap a service command so portless manages its port and `*.localhost` URL. */
export function wrapCommand(name: string, cmd: string): string {
  return `portless ${name} ${cmd}`
}

/** The URL portless serves a named service at (HTTPS on the local CA). */
export function portlessHealthUrl(name: string, healthPathOrUrl: string): string {
  if (healthPathOrUrl.startsWith('http')) return healthPathOrUrl
  return `https://${name}.localhost${healthPathOrUrl}`
}

/** Probe for the portless binary. `check` is injectable for tests. */
export async function isPortlessAvailable(check?: () => Promise<boolean>): Promise<boolean> {
  if (check) return check()
  try {
    await x('portless', ['--version'], { throwOnError: true })
    return true
  } catch {
    return false
  }
}

/**
 * Decide how to launch given the resolved flags. Pure — the I/O (availability
 * probe) is done by the caller via `isPortlessAvailable`.
 */
export function resolvePortlessMode(opts: {
  enabled: boolean
  available: boolean
  explicit: boolean
}): PortlessDecision {
  if (!opts.enabled) return { mode: 'fallback' }
  if (opts.available) return { mode: 'use' }
  if (opts.explicit) {
    return {
      mode: 'error',
      reason:
        'portless was requested (QPROBE_PORTLESS=1) but the `portless` binary was not found. Install it (npm i -g portless) or unset QPROBE_PORTLESS.',
    }
  }
  return {
    mode: 'fallback',
    reason:
      'portless not found — falling back to localhost/port. Install portless for stable per-worktree URLs.',
  }
}
