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
    validateConfig(_config)
  } catch (err) {
    if (err instanceof ConfigError) throw err
    const msg = err instanceof Error ? err.message : String(err)
    throw new ConfigError(msg)
  }

  return _config
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError' as const
}

const KNOWN_SERVICE_FIELDS = new Set([
  'cmd',
  'ready',
  'port',
  'health',
  'depends',
  'env',
  'cwd',
  'stop',
  'timeout',
])

const SERVICE_FIELD_TYPOS: Record<string, string> = {
  command: 'cmd',
  run: 'cmd',
  exec: 'cmd',
  script: 'cmd',
  readyPattern: 'ready',
  pattern: 'ready',
  readyOn: 'ready',
  healthCheck: 'health',
  healthUrl: 'health',
  healthcheck: 'health',
  workdir: 'cwd',
  workingDirectory: 'cwd',
  dir: 'cwd',
  directory: 'cwd',
  dependsOn: 'depends',
  dependencies: 'depends',
  requires: 'depends',
  environment: 'env',
  envVars: 'env',
  stopCmd: 'stop',
  stopCommand: 'stop',
  timeoutMs: 'timeout',
}

const KNOWN_TOP_LEVEL_FIELDS = new Set(['services', 'browser', 'http', 'logs', 'tests'])

const KNOWN_BROWSER_DRIVERS = new Set(['agent-browser', 'playwright'])

function validateConfig(config: ProbeConfig): void {
  const errors: string[] = []

  // Check for unknown top-level fields
  for (const key of Object.keys(config)) {
    if (!KNOWN_TOP_LEVEL_FIELDS.has(key)) {
      errors.push(
        `Unknown top-level field "${key}". Valid fields: ${[...KNOWN_TOP_LEVEL_FIELDS].join(', ')}`,
      )
    }
  }

  // Validate services
  if (config.services) {
    if (typeof config.services !== 'object' || Array.isArray(config.services)) {
      errors.push('"services" must be an object mapping service names to configs')
    } else {
      for (const [name, svc] of Object.entries(config.services)) {
        validateService(name, svc, config.services, errors)
      }
    }
  }

  // Validate browser config
  if (config.browser) {
    if (config.browser.driver && !KNOWN_BROWSER_DRIVERS.has(config.browser.driver)) {
      errors.push(
        `Invalid browser.driver "${config.browser.driver}". Must be one of: ${[...KNOWN_BROWSER_DRIVERS].join(', ')}`,
      )
    }
    if (config.browser.baseUrl && !isValidUrl(config.browser.baseUrl)) {
      errors.push(
        `Invalid browser.baseUrl "${config.browser.baseUrl}". Must be a valid URL (e.g. "http://localhost:3000")`,
      )
    }
  }

  // Validate http config
  if (config.http) {
    if (config.http.baseUrl && !isValidUrl(config.http.baseUrl)) {
      errors.push(
        `Invalid http.baseUrl "${config.http.baseUrl}". Must be a valid URL (e.g. "http://localhost:3000")`,
      )
    }
  }

  // Validate tests config
  if (config.tests) {
    if (
      config.tests.timeout !== undefined &&
      (typeof config.tests.timeout !== 'number' || config.tests.timeout <= 0)
    ) {
      errors.push('Invalid tests.timeout: must be a positive number (ms)')
    }
  }

  if (errors.length > 0) {
    const header = `Config validation failed (${errors.length} error${errors.length > 1 ? 's' : ''}):\n`
    const body = errors.map((e) => `  - ${e}`).join('\n')
    throw new ConfigError(`${header}${body}`)
  }
}

function validateService(
  name: string,
  svc: ServiceConfig,
  allServices: Record<string, ServiceConfig>,
  errors: string[],
): void {
  // Check for unknown/typo fields
  for (const key of Object.keys(svc)) {
    if (!KNOWN_SERVICE_FIELDS.has(key)) {
      const suggestion = SERVICE_FIELD_TYPOS[key]
      if (suggestion) {
        errors.push(
          `Service "${name}" has unknown field "${key}". Did you mean "${suggestion}"?\n` +
            `    Example: { ${suggestion}: ${JSON.stringify(key === 'command' ? (svc as unknown as Record<string, unknown>)[key] : '...')} }`,
        )
      } else {
        errors.push(
          `Service "${name}" has unknown field "${key}". Valid fields: ${[...KNOWN_SERVICE_FIELDS].join(', ')}`,
        )
      }
    }
  }

  // cmd is required
  if (!svc.cmd || typeof svc.cmd !== 'string') {
    // Check if they used a common typo
    const raw = svc as unknown as Record<string, unknown>
    const typoKey = Object.keys(raw).find((k) => SERVICE_FIELD_TYPOS[k] === 'cmd')
    if (typoKey) {
      errors.push(
        `Service "${name}" is missing required field "cmd". Found "${typoKey}" instead.\n` +
          `    Fix: rename "${typoKey}" to "cmd"\n` +
          `    Example: { cmd: ${JSON.stringify(raw[typoKey])} }`,
      )
    } else {
      errors.push(
        `Service "${name}" is missing required field "cmd".\n    Example: { cmd: 'bun dev', ready: 'ready on', port: 3000 }`,
      )
    }
  }

  // Validate port
  if (svc.port !== undefined) {
    if (typeof svc.port !== 'number' || svc.port < 1 || svc.port > 65535) {
      errors.push(
        `Service "${name}": port must be a number between 1 and 65535, got ${JSON.stringify(svc.port)}`,
      )
    }
  }

  // Validate depends references exist
  if (svc.depends) {
    if (!Array.isArray(svc.depends)) {
      errors.push(`Service "${name}": "depends" must be an array of service names`)
    } else {
      for (const dep of svc.depends) {
        if (!allServices[dep]) {
          const available = Object.keys(allServices).filter((n) => n !== name)
          errors.push(
            `Service "${name}" depends on "${dep}", but no service named "${dep}" exists.${available.length > 0 ? ` Available services: ${available.join(', ')}` : ''}`,
          )
        }
      }
    }
  }

  // Validate env is an object
  if (svc.env !== undefined && (typeof svc.env !== 'object' || Array.isArray(svc.env))) {
    errors.push(`Service "${name}": "env" must be an object (e.g. { PORT: '3000' })`)
  }

  // Validate health URL/path
  if (svc.health && typeof svc.health === 'string') {
    if (!svc.health.startsWith('/') && !svc.health.startsWith('http')) {
      errors.push(
        `Service "${name}": "health" must be a URL or path starting with "/"\n    Example: health: '/api/health' or health: 'http://localhost:5432'`,
      )
    }
  }

  // Validate timeout
  if (svc.timeout !== undefined && (typeof svc.timeout !== 'number' || svc.timeout <= 0)) {
    errors.push(`Service "${name}": "timeout" must be a positive number (ms)`)
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export { validateConfig }

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
