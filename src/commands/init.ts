import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import type { CommandDef } from 'citty'
import { defineCommand } from 'citty'
import { error, info, success, warn } from '../utils/output'

const CONFIG_TEMPLATE = `import { defineConfig } from '@questpie/probe'

export default defineConfig({
  services: {
    // db: {
    //   cmd: 'docker compose up postgres',
    //   ready: 'ready to accept connections',
    //   health: 'http://localhost:5432',
    //   stop: 'docker compose down postgres',
    // },
    // server: {
    //   cmd: 'bun dev',
    //   ready: 'ready on http://localhost:3000',
    //   port: 3000,
    //   health: '/api/health',
    //   depends: ['db'],
    //   env: {
    //     DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dev',
    //   },
    // },
  },

  browser: {
    driver: 'agent-browser',
    baseUrl: 'http://localhost:3000',
    headless: true,
    session: 'qprobe',
  },

  http: {
    baseUrl: 'http://localhost:3000',
    headers: {
      'Content-Type': 'application/json',
    },
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
})
`

const GITIGNORE_ADDITION = '\n# QUESTPIE Probe\ntmp/qprobe/\n'

const command = defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize QUESTPIE Probe config in current project',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing config',
      default: false,
    },
  },
  async run({ args }) {
    const configPath = 'qprobe.config.ts'

    // Check if config already exists
    if (!args.force) {
      try {
        await access(configPath)
        error(`${configPath} already exists. Use --force to overwrite.`)
        process.exit(1)
      } catch {
        // doesn't exist, good
      }
    }

    // Write config
    await writeFile(configPath, CONFIG_TEMPLATE, 'utf-8')
    success(`Created ${configPath}`)

    // Create directories
    await mkdir('tmp/qprobe/logs', { recursive: true })
    await mkdir('tmp/qprobe/pids', { recursive: true })
    await mkdir('tests/qprobe/recordings', { recursive: true })
    info('Created tmp/qprobe/ and tests/qprobe/ directories')

    // Add to .gitignore if it exists
    try {
      const gitignore = await readFile('.gitignore', 'utf-8')
      if (!gitignore.includes('tmp/qprobe')) {
        await writeFile('.gitignore', gitignore + GITIGNORE_ADDITION, 'utf-8')
        info('Added tmp/qprobe/ to .gitignore')
      }
    } catch {
      // no .gitignore, skip
    }

    // Add @questpie/probe as devDependency so config import resolves
    try {
      const pkgRaw = await readFile('package.json', 'utf-8')
      const pkg = JSON.parse(pkgRaw) as Record<string, unknown>
      const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>
      if (!devDeps['@questpie/probe']) {
        devDeps['@questpie/probe'] = 'latest'
        pkg.devDependencies = devDeps
        await writeFile('package.json', `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8')
        success('Added @questpie/probe to devDependencies')
        info('Run your package manager install to complete setup (e.g. "bun install")')
      }
    } catch {
      warn(
        'Could not update package.json — add @questpie/probe manually: bun add -d @questpie/probe',
      )
    }

    info('Run "qprobe doctor" to verify your setup')
    info('Run "qprobe compose up" to start your stack')
  },
})
export default command as CommandDef
