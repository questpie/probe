import { existsSync } from 'node:fs'
import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { ConfigError, loadProbeConfig } from '../core/config'
import { error, info, success, warn } from '../utils/output'

async function checkBrowserDriver(driver: string): Promise<boolean> {
  try {
    const { x } = await import('tinyexec')
    if (driver === 'agent-browser') {
      const result = await x('agent-browser', ['--version'], { timeout: 5_000 })
      return result.exitCode === 0
    }
    if (driver === 'playwright') {
      const result = await x('npx', ['playwright', '--version'], { timeout: 10_000 })
      return result.exitCode === 0
    }
    return false
  } catch {
    return false
  }
}

async function checkPortAvailable(port: number): Promise<boolean> {
  try {
    const { createServer } = await import('node:net')
    return new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close(() => resolve(true))
      })
      server.listen(port)
    })
  } catch {
    return false
  }
}

const command = defineCommand({
  meta: {
    name: 'doctor',
    description: 'Check that qprobe is set up correctly',
  },
  args: {},
  async run() {
    let hasErrors = false
    const pass = (msg: string) => success(msg)
    const fail = (msg: string) => {
      error(msg)
      hasErrors = true
    }

    info('Running qprobe doctor...\n')

    // 1. Check config file exists
    const configExists =
      existsSync('qprobe.config.ts') ||
      existsSync('qprobe.config.js') ||
      existsSync('qprobe.config.mjs')

    if (configExists) {
      pass('Config file found')
    } else {
      warn('No config file found (qprobe.config.ts). Run "qprobe init" to create one.')
    }

    // 2. Validate config loads and passes validation
    let config: Awaited<ReturnType<typeof loadProbeConfig>> | undefined
    try {
      config = await loadProbeConfig()
      pass('Config loaded and validated')
    } catch (err) {
      if (err instanceof ConfigError) {
        fail(`Config validation failed:\n${err.message}`)
      } else {
        fail(`Config failed to load: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // 3. Check browser driver
    if (config?.browser?.driver) {
      const driver = config.browser.driver
      info(`Checking browser driver: ${driver}`)
      const installed = await checkBrowserDriver(driver)
      if (installed) {
        pass(`Browser driver "${driver}" is available`)
      } else {
        fail(
          `Browser driver "${driver}" is not installed or not in PATH.\n${
            driver === 'agent-browser'
              ? '  Install: npm install -g agent-browser'
              : '  Install: npx playwright install'
          }`,
        )
      }
    }

    // 4. Check service ports are available
    if (config?.services) {
      const ports = new Set<number>()
      for (const [name, svc] of Object.entries(config.services)) {
        if (svc.port) {
          if (ports.has(svc.port)) {
            fail(`Port ${svc.port} is used by multiple services`)
          }
          ports.add(svc.port)

          const available = await checkPortAvailable(svc.port)
          if (available) {
            pass(`Port ${svc.port} (${name}) is available`)
          } else {
            warn(`Port ${svc.port} (${name}) is already in use — service may already be running`)
          }
        }
      }
    }

    // 5. Check log directory is writable
    const logsDir = config?.logs?.dir ?? 'tmp/qprobe/logs'
    try {
      const { mkdir, writeFile, unlink } = await import('node:fs/promises')
      await mkdir(logsDir, { recursive: true })
      const testFile = `${logsDir}/.doctor-check`
      await writeFile(testFile, '')
      await unlink(testFile)
      pass(`Log directory writable: ${logsDir}`)
    } catch {
      fail(`Cannot write to log directory: ${logsDir}`)
    }

    // 6. Check @questpie/probe is resolvable (for config import)
    try {
      await import('@questpie/probe')
      pass('Package @questpie/probe is resolvable')
    } catch {
      warn(
        '@questpie/probe is not locally resolvable. Config "import { defineConfig } from \'@questpie/probe\'" may fail.\n' +
          '  Fix: bun add -d @questpie/probe',
      )
    }

    // Summary
    info('')
    if (hasErrors) {
      error('Doctor found issues that need fixing.')
      process.exit(1)
    } else {
      success('All checks passed!')
    }
  },
})
export default command as CommandDef
