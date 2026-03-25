import { describe, expect, test } from 'bun:test'
import { resolveDependencyOrder } from '../../src/core/compose-engine'
import type { ServiceConfig } from '../../src/core/config'

const services: Record<string, ServiceConfig> = {
  db: { cmd: 'docker compose up postgres', ready: 'ready' },
  server: { cmd: 'bun dev', port: 3000, depends: ['db'] },
  admin: { cmd: 'bun admin:dev', port: 3001, depends: ['server'] },
  worker: { cmd: 'bun jobs', depends: ['db'] },
}

describe('resolveDependencyOrder', () => {
  test('resolves full dependency graph', () => {
    const order = resolveDependencyOrder(services)
    const dbIdx = order.indexOf('db')
    const serverIdx = order.indexOf('server')
    const adminIdx = order.indexOf('admin')
    const workerIdx = order.indexOf('worker')

    expect(dbIdx).toBeLessThan(serverIdx)
    expect(serverIdx).toBeLessThan(adminIdx)
    expect(dbIdx).toBeLessThan(workerIdx)
    expect(order.length).toBe(4)
  })

  test('only includes requested services + deps', () => {
    const order = resolveDependencyOrder(services, ['admin'])
    expect(order).toContain('admin')
    expect(order).toContain('server')
    expect(order).toContain('db')
    expect(order).not.toContain('worker')
  })

  test('skip excludes services', () => {
    const order = resolveDependencyOrder(services, undefined, ['admin', 'worker'])
    expect(order).toContain('db')
    expect(order).toContain('server')
    expect(order).not.toContain('admin')
    expect(order).not.toContain('worker')
  })

  test('only + skip', () => {
    const order = resolveDependencyOrder(services, ['admin'], ['server'])
    expect(order).toContain('admin')
    expect(order).toContain('db')
    expect(order).not.toContain('server')
  })

  test('throws on unknown service in only', () => {
    expect(() => resolveDependencyOrder(services, ['ghost'])).toThrow('Unknown service')
  })

  test('throws on circular dependency', () => {
    const circular: Record<string, ServiceConfig> = {
      a: { cmd: 'a', depends: ['b'] },
      b: { cmd: 'b', depends: ['a'] },
    }
    expect(() => resolveDependencyOrder(circular)).toThrow('Circular dependency')
  })

  test('services without deps come first', () => {
    const simple: Record<string, ServiceConfig> = {
      api: { cmd: 'api' },
      web: { cmd: 'web', depends: ['api'] },
    }
    const order = resolveDependencyOrder(simple)
    expect(order[0]).toBe('api')
    expect(order[1]).toBe('web')
  })

  test('empty services returns empty', () => {
    const order = resolveDependencyOrder({})
    expect(order.length).toBe(0)
  })
})
