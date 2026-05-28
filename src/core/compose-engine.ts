import { ofetch } from 'ofetch'
import type { ServiceConfig } from './config'
import { isProcessAlive, startProcess, stopProcess } from './process-manager'
import { getSessionId } from './session'
import { interpolate, runSetup } from './setup-hooks'
import { addRef, removeRef } from './shared-service'
import { readPid } from './state'

export interface ComposeService {
  name: string
  config: ServiceConfig
}

export function resolveDependencyOrder(
  services: Record<string, ServiceConfig>,
  only?: string[],
  skip?: string[],
): string[] {
  const filtered = new Set<string>()

  if (only && only.length > 0) {
    // Include requested services + their dependencies
    const queue = [...only]
    while (queue.length > 0) {
      const name = queue.pop()!
      if (filtered.has(name)) continue
      const svc = services[name]
      if (!svc) throw new Error(`Unknown service: "${name}"`)
      filtered.add(name)
      if (svc.depends) {
        for (const dep of svc.depends) {
          queue.push(dep)
        }
      }
    }
  } else {
    for (const name of Object.keys(services)) {
      filtered.add(name)
    }
  }

  if (skip) {
    for (const name of skip) {
      filtered.delete(name)
    }
  }

  // Topological sort
  const sorted: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(name: string): void {
    if (visited.has(name)) return
    if (visiting.has(name)) throw new Error(`Circular dependency detected: ${name}`)
    if (!filtered.has(name)) return

    visiting.add(name)
    const svc = services[name]
    if (svc?.depends) {
      for (const dep of svc.depends) {
        visit(dep)
      }
    }
    visiting.delete(name)
    visited.add(name)
    sorted.push(name)
  }

  for (const name of filtered) {
    visit(name)
  }

  return sorted
}

export async function composeUp(
  services: Record<string, ServiceConfig>,
  opts: { only?: string[]; skip?: string[]; noHealth?: boolean },
): Promise<string[]> {
  const order = resolveDependencyOrder(services, opts.only, opts.skip)
  const started: string[] = []

  for (const name of order) {
    const svc = services[name]!
    const scope = svc.shared ? 'shared' : 'session'

    // ${SESSION} / ${PORT} interpolation for cmd, env, and setup commands.
    const vars: Record<string, string> = {
      SESSION: getSessionId(),
      PORT: svc.port !== undefined ? String(svc.port) : '',
    }
    const cmd = interpolate(svc.cmd, vars)
    const env = svc.env
      ? Object.fromEntries(Object.entries(svc.env).map(([k, v]) => [k, interpolate(v, vars)]))
      : undefined

    if (svc.shared) {
      // Shared service: reuse if already running in the shared scope, otherwise
      // start it there. Either way, register this session's reference.
      const existingPid = await readPid(name, 'shared')
      const alreadyRunning = existingPid !== null && isProcessAlive(existingPid)
      if (!alreadyRunning) {
        await startProcess({
          name,
          cmd,
          ready: svc.ready,
          timeout: svc.timeout ? svc.timeout : 60_000,
          port: svc.port,
          env,
          cwd: svc.cwd,
          shared: true,
        })
      }
      await addRef(name, getSessionId())
    } else {
      await startProcess({
        name,
        cmd,
        ready: svc.ready,
        timeout: svc.timeout ? svc.timeout : 60_000,
        port: svc.port,
        env,
        cwd: svc.cwd,
      })
    }
    started.push(name)

    if (!opts.noHealth && svc.health) {
      const healthUrl = svc.health.startsWith('http')
        ? svc.health
        : `http://localhost:${svc.port ?? 3000}${svc.health}`

      await waitForHealth(healthUrl, svc.timeout ?? 30_000)
    }

    // Run setup hooks once the service is healthy (idempotent per scope).
    if (svc.setup && svc.setup.length > 0) {
      await runSetup(name, svc.setup, { scope, vars })
    }
  }

  return started
}

export async function composeDown(services: Record<string, ServiceConfig>): Promise<string[]> {
  const order = resolveDependencyOrder(services)
  const reversed = [...order].reverse()
  const stopped: string[] = []

  for (const name of reversed) {
    const svc = services[name]
    try {
      if (svc?.shared) {
        // Release this session's reference; only stop once nobody else holds it.
        const remaining = await removeRef(name, getSessionId())
        if (remaining.length === 0) {
          await stopProcess(name, 'shared')
          stopped.push(name)
        }
      } else {
        await stopProcess(name)
        stopped.push(name)
      }
    } catch {
      // may not be running
    }
  }

  return stopped
}

async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await ofetch.raw(url, { ignoreResponseError: true })
      if (response.status >= 200 && response.status < 400) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }
  throw new Error(`Health check failed for ${url} after ${timeoutMs}ms`)
}
