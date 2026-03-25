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

export interface PlaywrightDriverOptions {
  browser?: 'chromium' | 'firefox' | 'webkit'
  headed?: boolean
  baseUrl?: string
}

export class PlaywrightDriver implements BrowserDriver {
  private readonly browserName: string
  private readonly headed: boolean
  private readonly baseUrl: string | undefined

  constructor(opts: PlaywrightDriverOptions = {}) {
    this.browserName = opts.browser ?? 'chromium'
    this.headed = opts.headed ?? false
    this.baseUrl = opts.baseUrl
  }

  private async run(...args: string[]): Promise<string> {
    const cmdArgs = ['playwright', ...args]
    const result = await x('npx', cmdArgs, {
      timeout: 30_000,
      throwOnError: false,
    })
    if (result.exitCode !== 0) {
      throw new Error(`playwright-cli failed: ${result.stderr || result.stdout}`)
    }
    return result.stdout.trim()
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (this.baseUrl) return `${this.baseUrl}${url}`
    return url
  }

  async open(url: string): Promise<void> {
    await this.run('open', this.resolveUrl(url), '--browser', this.browserName)
  }

  async back(): Promise<void> {
    await this.run('evaluate', 'window.history.back()')
  }

  async forward(): Promise<void> {
    await this.run('evaluate', 'window.history.forward()')
  }

  async reload(): Promise<void> {
    await this.run('evaluate', 'window.location.reload()')
  }

  async url(): Promise<string> {
    return this.run('evaluate', 'window.location.href')
  }

  async title(): Promise<string> {
    return this.run('evaluate', 'document.title')
  }

  async close(): Promise<void> {
    await this.run('evaluate', 'window.close()')
  }

  async snapshot(_opts?: SnapshotOpts): Promise<string> {
    return this.run('snapshot')
  }

  async click(ref: string): Promise<void> {
    await this.run('click', ref)
  }

  async dblclick(ref: string): Promise<void> {
    await this.run('dblclick', ref)
  }

  async fill(ref: string, value: string): Promise<void> {
    await this.run('fill', ref, value)
  }

  async select(ref: string, value: string): Promise<void> {
    await this.run('select-option', ref, value)
  }

  async check(ref: string): Promise<void> {
    await this.run('check', ref)
  }

  async uncheck(ref: string): Promise<void> {
    await this.run('uncheck', ref)
  }

  async press(key: string): Promise<void> {
    await this.run('press', key)
  }

  async type(text: string): Promise<void> {
    await this.run('type', text)
  }

  async hover(ref: string): Promise<void> {
    await this.run('hover', ref)
  }

  async focus(ref: string): Promise<void> {
    await this.run('focus', ref)
  }

  async scroll(_direction: string, _px?: number): Promise<void> {
    await this.run('evaluate', `window.scrollBy(0, ${_direction === 'up' ? -(_px ?? 300) : (_px ?? 300)})`)
  }

  async upload(ref: string, file: string): Promise<void> {
    await this.run('set-input-files', ref, file)
  }

  async screenshot(opts?: ScreenshotOpts): Promise<string> {
    const path = opts?.path ?? 'screenshot.png'
    await this.run('screenshot', '--path', path)
    return path
  }

  async eval(js: string): Promise<string> {
    return this.run('evaluate', js)
  }

  async text(_selector?: string): Promise<string> {
    return this.run('evaluate', 'document.body.innerText')
  }

  async console(_opts?: ConsoleOpts): Promise<ConsoleEntry[]> {
    // Playwright CLI doesn't have direct console access
    return []
  }

  async errors(): Promise<ErrorEntry[]> {
    return []
  }

  async network(_opts?: NetworkOpts): Promise<NetworkEntry[]> {
    return []
  }

  async wait(opts: WaitOpts): Promise<void> {
    if (opts.selector || opts.ref) {
      await this.run('wait-for-selector', opts.selector ?? opts.ref ?? '')
    } else {
      await this.run('evaluate', 'new Promise(r => setTimeout(r, 1000))')
    }
  }
}

export function createPlaywrightDriver(opts?: PlaywrightDriverOptions): BrowserDriver {
  return new PlaywrightDriver(opts)
}
