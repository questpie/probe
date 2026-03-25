import { loadConfig } from 'c12'
import { defu } from 'defu'
import { parseDuration } from '../utils/duration'

export interface ServiceConfig {
  cmd: string
  ready?: string
  port?: number
  health?: string
  depends?: string[]
  env?: Record<string, string>
  cwd?: string
  stop?: string
  timeout?: number
}

export interface BrowserConfig {
  driver?: 'agent-browser' | 'playwright'
  baseUrl?: string
  headless?: boolean
  session?: string
}

export interface HttpConfig {
  baseUrl?: string
  headers?: Record<string, string>
}

export interface ProbeConfig {
  services?: Record<string, ServiceConfig>
  browser?: BrowserConfig
  http?: HttpConfig
  logs?: {
    dir?: string
    maxSize?: string
    browserConsole?: boolean
  }
  tests?: {
    dir?: string
    timeout?: number
  }
}

const defaults: ProbeConfig = {
  browser: {
    driver: 'agent-browser',
    headless: true,
    session: 'qprobe',
  },
  logs: {
    dir: 'tmp/qprobe/logs',
    maxSize: '10mb',
    browserConsole: true,
  },
  tests: {
    dir: 'tests/qprobe',
    timeout: 30_000,
  },
}

export function defineConfig(config: ProbeConfig): ProbeConfig {
  return config
}

let _config: ProbeConfig | null = null

export async function loadProbeConfig(): Promise<ProbeConfig> {
  if (_config) return _config

  try {
    const configFile = process.env.QPROBE_CONFIG

    const { config } = await loadConfig<ProbeConfig>({
      name: 'qprobe',
      defaults,
      ...(configFile ? { configFile } : {}),
    })

    _config = defu(config ?? {}, defaults)

    applyEnvOverrides(_config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new ConfigError(msg)
  }

  return _config
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError' as const
  constructor(message: string) {
    super(message)
  }
}

function applyEnvOverrides(config: ProbeConfig): void {
  const baseUrl = process.env.QPROBE_BASE_URL
  if (baseUrl) {
    config.http = config.http ?? {}
    config.http.baseUrl = baseUrl
    config.browser = config.browser ?? {}
    config.browser.baseUrl = baseUrl
  }

  const browserDriver = process.env.QPROBE_BROWSER_DRIVER
  if (browserDriver === 'agent-browser' || browserDriver === 'playwright') {
    config.browser = config.browser ?? {}
    config.browser.driver = browserDriver
  }

  const logDir = process.env.QPROBE_LOG_DIR
  if (logDir) {
    config.logs = config.logs ?? {}
    config.logs.dir = logDir
  }

  const headless = process.env.QPROBE_HEADLESS
  if (headless === 'true' || headless === 'false') {
    config.browser = config.browser ?? {}
    config.browser.headless = headless === 'true'
  }

  const timeout = process.env.QPROBE_TIMEOUT
  if (timeout) {
    config.tests = config.tests ?? {}
    config.tests.timeout = parseDuration(timeout)
  }
}

export function resolveBaseUrl(config: ProbeConfig): string {
  const envBaseUrl = process.env.QPROBE_BASE_URL
  if (envBaseUrl) return envBaseUrl

  if (config.http?.baseUrl) return config.http.baseUrl
  if (config.browser?.baseUrl) return config.browser.baseUrl

  const firstServiceWithPort = Object.values(config.services ?? {}).find((s) => s.port)
  if (firstServiceWithPort?.port) return `http://localhost:${firstServiceWithPort.port}`

  return 'http://localhost:3000'
}
