import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { x } from 'tinyexec'
import type {
  BrowserDriver,
  ConsoleEntry,
  ConsoleOpts,
  ErrorEntry,
  NetworkEntry,
  NetworkOpts,
  ScreenshotOpts,
  SnapshotOpts,
  WaitOpts,
} from './types'

const SNAPSHOTS_DIR = 'tmp/qprobe/snapshots'
const SHOTS_DIR = 'tmp/qprobe/shots'

interface AgentBrowserResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

export interface AgentBrowserOptions {
  session?: string
  headed?: boolean
  baseUrl?: string
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

let shotCounter = 0

export class AgentBrowserDriver implements BrowserDriver {
  private readonly session: string
  private readonly headed: boolean
  private readonly baseUrl: string | undefined

  constructor(opts: AgentBrowserOptions = {}) {
    this.session = opts.session ?? 'qprobe'
    this.headed = opts.headed ?? false
    this.baseUrl = opts.baseUrl
  }

  private async run(...args: string[]): Promise<AgentBrowserResponse> {
    const cmdArgs = ['--session', this.session, '--json', ...args]
    if (this.headed) {
      cmdArgs.unshift('--headed')
    }

    const result = await x('agent-browser', cmdArgs, {
      timeout: 30_000,
      throwOnError: false,
    })

    const out = result.stdout.trim()
    if (!out) {
      if (result.exitCode !== 0) {
        throw new Error(`agent-browser failed (exit ${result.exitCode}): ${result.stderr}`)
      }
      return { success: true }
    }

    try {
      return JSON.parse(out) as AgentBrowserResponse
    } catch {
      return { success: true, data: { text: out } }
    }
  }

  private async runOrThrow(...args: string[]): Promise<Record<string, unknown>> {
    const res = await this.run(...args)
    if (!res.success) {
      throw new Error(res.error ?? 'agent-browser command failed')
    }
    return res.data ?? {}
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (this.baseUrl) return `${this.baseUrl}${url}`
    return url
  }

  async open(url: string): Promise<void> {
    await this.runOrThrow('open', this.resolveUrl(url))
  }

  async back(): Promise<void> {
    await this.runOrThrow('back')
  }

  async forward(): Promise<void> {
    await this.runOrThrow('forward')
  }

  async reload(): Promise<void> {
    await this.runOrThrow('reload')
  }

  async url(): Promise<string> {
    const data = await this.runOrThrow('get', 'url')
    return String(data['text'] ?? data['url'] ?? '')
  }

  async title(): Promise<string> {
    const data = await this.runOrThrow('get', 'title')
    return String(data['text'] ?? data['title'] ?? '')
  }

  async close(): Promise<void> {
    await this.runOrThrow('close')
  }

  async snapshot(opts?: SnapshotOpts): Promise<string> {
    const args: string[] = ['snapshot']
    if (opts?.interactive) args.push('-i')
    if (opts?.compact) args.push('-c')
    if (opts?.depth !== undefined) args.push('-d', String(opts.depth))
    if (opts?.selector) args.push('-s', opts.selector)

    const data = await this.runOrThrow(...args)
    const snapshotText = String(data['snapshot'] ?? data['text'] ?? '')

    await ensureDir(SNAPSHOTS_DIR)
    const currentPath = join(SNAPSHOTS_DIR, 'current.yaml')
    const previousPath = join(SNAPSHOTS_DIR, 'previous.yaml')

    try {
      const existing = await readFile(currentPath, 'utf-8')
      await writeFile(previousPath, existing, 'utf-8')
    } catch {
      // no previous snapshot
    }
    await writeFile(currentPath, snapshotText, 'utf-8')

    if (opts?.diff) {
      const { diffSnapshots } = await import('./snapshot-diff')
      try {
        const previous = await readFile(previousPath, 'utf-8')
        return diffSnapshots(previous, snapshotText)
      } catch {
        return snapshotText
      }
    }

    return snapshotText
  }

  async click(ref: string): Promise<void> {
    await this.runOrThrow('click', ref)
  }

  async dblclick(ref: string): Promise<void> {
    await this.runOrThrow('dblclick', ref)
  }

  async fill(ref: string, value: string): Promise<void> {
    await this.runOrThrow('fill', ref, value)
  }

  async select(ref: string, value: string): Promise<void> {
    await this.runOrThrow('select', ref, value)
  }

  async check(ref: string): Promise<void> {
    await this.runOrThrow('check', ref)
  }

  async uncheck(ref: string): Promise<void> {
    await this.runOrThrow('uncheck', ref)
  }

  async press(key: string): Promise<void> {
    await this.runOrThrow('press', key)
  }

  async type(text: string): Promise<void> {
    await this.runOrThrow('type', text)
  }

  async hover(ref: string): Promise<void> {
    await this.runOrThrow('hover', ref)
  }

  async focus(ref: string): Promise<void> {
    await this.runOrThrow('focus', ref)
  }

  async scroll(direction: string, px?: number): Promise<void> {
    const args = ['scroll', direction]
    if (px !== undefined) args.push(String(px))
    await this.runOrThrow(...args)
  }

  async upload(ref: string, file: string): Promise<void> {
    await this.runOrThrow('upload', ref, file)
  }

  async screenshot(opts?: ScreenshotOpts): Promise<string> {
    await ensureDir(SHOTS_DIR)
    shotCounter++
    const defaultPath = join(SHOTS_DIR, `shot-${String(shotCounter).padStart(3, '0')}.png`)
    const targetPath = opts?.path ?? defaultPath

    const args: string[] = ['screenshot', targetPath]
    if (opts?.annotate) args.push('--annotate')
    if (opts?.full) args.push('--full')
    if (opts?.selector) args.push('--selector', opts.selector)

    const data = await this.runOrThrow(...args)
    return String(data['path'] ?? targetPath)
  }

  async eval(js: string): Promise<string> {
    const data = await this.runOrThrow('eval', js)
    return String(data['text'] ?? data['result'] ?? JSON.stringify(data))
  }

  async text(selector?: string): Promise<string> {
    const args = ['get', 'text']
    if (selector) args.push(selector)
    const data = await this.runOrThrow(...args)
    return String(data['text'] ?? '')
  }

  async console(opts?: ConsoleOpts): Promise<ConsoleEntry[]> {
    const args: string[] = ['console']
    if (opts?.clear) args.push('--clear')

    const data = await this.runOrThrow(...args)
    const messages = (data['messages'] as ConsoleEntry[] | undefined) ?? []

    if (opts?.level) {
      return messages.filter((m) => m.level === opts.level)
    }
    return messages
  }

  async errors(): Promise<ErrorEntry[]> {
    const data = await this.runOrThrow('errors')
    return (data['errors'] as ErrorEntry[] | undefined) ?? []
  }

  async network(opts?: NetworkOpts): Promise<NetworkEntry[]> {
    const args: string[] = ['network', 'requests']
    if (opts?.method) args.push('--method', opts.method)
    if (opts?.grep) args.push('--filter', opts.grep)

    const data = await this.runOrThrow(...args)
    let entries = (data['requests'] as NetworkEntry[] | undefined) ?? []

    if (opts?.failed) {
      entries = entries.filter((e) => e.status >= 400)
    }
    return entries
  }

  async wait(opts: WaitOpts): Promise<void> {
    const args: string[] = ['wait']
    const timeout = opts.timeout ?? 30_000

    if (opts.ref) {
      args.push(opts.ref)
    } else if (opts.selector) {
      args.push(opts.selector)
    } else if (opts.url) {
      args.push('--url', opts.url)
    } else if (opts.text) {
      args.push('--text', opts.text)
    } else if (opts.network === 'idle') {
      args.push('--network', 'idle')
    }

    if (opts.hidden) args.push('--hidden')
    args.push('--timeout', String(timeout))

    await this.runOrThrow(...args)
  }
}

export function createAgentBrowserDriver(opts?: AgentBrowserOptions): BrowserDriver {
  return new AgentBrowserDriver(opts)
}
