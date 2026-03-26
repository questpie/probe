import { spawn } from 'node:child_process'
import { openSync } from 'node:fs'
import { createLogWriter } from './log-writer'
import type { ProcessState } from './state'
import {
  ensureLogsDir,
  getLogPath,
  listProcessNames,
  readPid,
  readState,
  removePid,
  removeState,
  savePid,
  saveState,
} from './state'

export interface StartOptions {
  name: string
  cmd: string
  ready?: string
  timeout?: number
  port?: number
  env?: Record<string, string>
  cwd?: string
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function startProcess(opts: StartOptions): Promise<{ pid: number }> {
  const existingPid = await readPid(opts.name)
  if (existingPid && isProcessAlive(existingPid)) {
    throw new Error(`Process "${opts.name}" is already running (PID ${existingPid})`)
  }

  await ensureLogsDir()

  if (!opts.cmd.trim()) throw new Error('Empty command. Provide a command to run (e.g. "bun dev")')

  // Use shell mode when command contains shell operators (&&, ||, |, ;, >, <)
  // This handles "cd dir && bunx ..." patterns correctly
  const useShell = /[&|;><]/.test(opts.cmd)
  const spawnArgs: [string, string[]] = useShell
    ? ['sh', ['-c', opts.cmd]]
    : (() => {
        const parts = opts.cmd.split(/\s+/)
        const cmd = parts[0] ?? opts.cmd
        return [cmd, parts.slice(1)] as [string, string[]]
      })()

  if (opts.ready) {
    // Use piped stdio for ready detection, then detach
    const logWriter = createLogWriter(opts.name)
    const child = spawn(spawnArgs[0], spawnArgs[1], {
      cwd: opts.cwd ?? process.cwd(),
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    })

    const pid = child.pid
    if (!pid) throw new Error('Failed to spawn process')

    child.stdout?.on('data', logWriter.stdout)
    child.stderr?.on('data', logWriter.stderr)

    await savePid(opts.name, pid)
    await saveState(opts.name, makeState(opts, pid))

    const timeoutMs = opts.timeout ?? 60_000
    await waitForReady(child, opts.ready, timeoutMs)

    // Detach pipes so CLI can exit while child continues
    child.stdout?.removeAllListeners()
    child.stderr?.removeAllListeners()
    child.stdout?.destroy()
    child.stderr?.destroy()
    child.unref()

    return { pid }
  }

  // No ready pattern — use file descriptors directly so CLI exits immediately
  const logPath = getLogPath(opts.name)
  const logFd = openSync(logPath, 'a')
  const child = spawn(spawnArgs[0], spawnArgs[1], {
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...opts.env },
    stdio: ['ignore', logFd, logFd],
    detached: true,
  })

  const pid = child.pid
  if (!pid) throw new Error('Failed to spawn process')

  child.unref()

  await savePid(opts.name, pid)
  await saveState(opts.name, makeState(opts, pid))

  return { pid }
}

function makeState(opts: StartOptions, pid: number): ProcessState {
  return {
    name: opts.name,
    cmd: opts.cmd,
    pid,
    port: opts.port,
    ready: opts.ready,
    cwd: opts.cwd,
    env: opts.env,
    timeout: opts.timeout,
    startedAt: new Date().toISOString(),
  }
}

function waitForReady(
  child: ReturnType<typeof spawn>,
  pattern: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const regex = new RegExp(pattern)
    let resolved = false
    const outputLines: string[] = []

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        const lastOutput = outputLines.slice(-10).join('\n')
        const hints = [
          `Ready pattern: /${pattern}/`,
          lastOutput ? `Last output:\n${lastOutput}` : 'No output was captured from the process.',
          'Hint: check that your ready pattern matches the actual process output.',
          'Hint: use --timeout to increase the wait time.',
        ]
        reject(
          new Error(`Timeout waiting for ready pattern after ${timeoutMs}ms.\n${hints.join('\n')}`),
        )
      }
    }, timeoutMs)

    const checkPattern = (chunk: Buffer) => {
      if (resolved) return
      const text = chunk.toString('utf-8')
      for (const line of text.split('\n')) {
        if (line.trim()) outputLines.push(line)
      }
      if (regex.test(text)) {
        resolved = true
        clearTimeout(timer)
        child.stdout?.removeAllListeners('data')
        child.stderr?.removeAllListeners('data')
        resolve()
      }
    }

    child.stdout?.on('data', checkPattern)
    child.stderr?.on('data', checkPattern)

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        const lastOutput = outputLines.slice(-10).join('\n')
        const hints: string[] = [
          `Process exited with code ${code} before the ready pattern was matched.`,
          `Ready pattern: /${pattern}/`,
        ]
        if (lastOutput) {
          hints.push(`Last output:\n${lastOutput}`)
        }
        if (code === 0) {
          hints.push(
            'The process exited cleanly (code 0) but never printed the ready pattern.',
            'This often happens with shell commands like "cd dir && cmd" — the shell exits while the child continues.',
            'Fix: use the --cwd flag instead of "cd" in the command, or remove the ready pattern.',
          )
        }
        reject(new Error(hints.join('\n')))
      }
    })
  })
}

export async function stopProcess(name: string): Promise<void> {
  const pid = await readPid(name)
  if (!pid) throw new Error(`No PID file for "${name}"`)

  if (!isProcessAlive(pid)) {
    await removePid(name)
    await removeState(name)
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // already dead
    }
  }

  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) break
    await new Promise((r) => setTimeout(r, 100))
  }

  if (isProcessAlive(pid)) {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // ignore
      }
    }
  }

  await removePid(name)
  await removeState(name)
}

export async function stopAll(): Promise<string[]> {
  const names = await listProcessNames()
  for (const name of names) {
    await stopProcess(name)
  }
  return names
}

export interface ProcessInfo {
  name: string
  pid: number
  port?: number
  status: 'running' | 'dead'
  uptime: string
}

export async function listProcesses(): Promise<ProcessInfo[]> {
  const names = await listProcessNames()
  const result: ProcessInfo[] = []

  for (const name of names) {
    const state = await readState(name)
    const pid = await readPid(name)
    if (!state || !pid) continue

    const alive = isProcessAlive(pid)
    if (!alive) {
      await removePid(name)
      await removeState(name)
      continue
    }

    const uptimeMs = Date.now() - new Date(state.startedAt).getTime()
    const { formatDuration } = await import('../utils/duration')

    result.push({
      name: state.name,
      pid,
      port: state.port,
      status: 'running',
      uptime: formatDuration(uptimeMs),
    })
  }

  return result
}

export async function getProcessState(name: string): Promise<ProcessState | null> {
  return readState(name)
}
