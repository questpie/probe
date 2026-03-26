#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { defineCommand, runMain, showUsage } from 'citty'
import { consola } from 'consola'

const subCommandNames = new Set([
  'start',
  'stop',
  'restart',
  'ps',
  'health',
  'compose',
  'logs',
  'http',
  'check',
  'browser',
  'record',
  'replay',
  'recordings',
  'assert',
  'init',
  'doctor',
])

const main = defineCommand({
  meta: {
    name: 'qprobe',
    version: '0.1.2',
    description: 'Dev testing CLI for AI coding agents',
  },
  subCommands: {
    start: () => import('./commands/start').then((m) => m.default),
    stop: () => import('./commands/stop').then((m) => m.default),
    restart: () => import('./commands/restart').then((m) => m.default),
    ps: () => import('./commands/ps').then((m) => m.default),
    health: () => import('./commands/health').then((m) => m.default),
    compose: () => import('./commands/compose').then((m) => m.default),
    logs: () => import('./commands/logs').then((m) => m.default),
    http: () => import('./commands/http').then((m) => m.default),
    check: () => import('./commands/check').then((m) => m.default),
    browser: () => import('./commands/browser').then((m) => m.default),
    record: () => import('./commands/record').then((m) => m.default),
    replay: () => import('./commands/replay').then((m) => m.default),
    recordings: () => import('./commands/recordings').then((m) => m.default),
    assert: () => import('./commands/assert').then((m) => m.default),
    init: () => import('./commands/init').then((m) => m.default),
    doctor: () => import('./commands/doctor').then((m) => m.default),
  },
  async run({ cmd, rawArgs }) {
    // Don't show onboarding if a subcommand was invoked
    const firstArg = rawArgs[0]
    if (firstArg && subCommandNames.has(firstArg)) return

    const hasConfig =
      existsSync('qprobe.config.ts') ||
      existsSync('qprobe.config.js') ||
      existsSync('qprobe.config.mjs')

    if (hasConfig) {
      await showUsage(cmd)
      return
    }

    consola.log('')
    consola.log('\x1b[1m\x1b[38;2;183;0;255m  QUESTPIE Probe\x1b[0m  \x1b[2mv0.1.2\x1b[0m')
    consola.log('  Dev testing CLI for AI coding agents')
    consola.log('')
    consola.log('  \x1b[1mGet started:\x1b[0m')
    consola.log('')
    consola.log('    \x1b[36mqprobe init\x1b[0m                          Scaffold qprobe.config.ts')
    consola.log(
      '    \x1b[36mbunx skills add questpie/probe\x1b[0m       Teach your AI agent to use Probe',
    )
    consola.log('')
    consola.log('  \x1b[2mOr skip the config and start using it:\x1b[0m')
    consola.log('')
    consola.log('    \x1b[36mqprobe start server "bun dev" --ready "ready on" --port 3000\x1b[0m')
    consola.log('    \x1b[36mqprobe http GET /api/health --status 200\x1b[0m')
    consola.log('    \x1b[36mqprobe logs server --grep "ERROR"\x1b[0m')
    consola.log('')
    consola.log('  \x1b[2mDocs:\x1b[0m \x1b[4mhttps://probe.questpie.com/docs\x1b[0m')
    consola.log('')
  },
})

runMain(main)
