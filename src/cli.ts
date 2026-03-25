#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'qprobe',
    version: '0.1.1',
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
  },
})

runMain(main)
