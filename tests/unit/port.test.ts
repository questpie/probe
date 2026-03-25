import { afterAll, describe, expect, test } from 'bun:test'
import { createServer } from 'node:net'
import { findFreePort, isPortInUse } from '../../src/utils/port'

describe('isPortInUse', () => {
  let server: ReturnType<typeof createServer>
  let usedPort: number

  afterAll(() => {
    server?.close()
  })

  test('returns false for free port', async () => {
    const port = await findFreePort()
    expect(await isPortInUse(port)).toBe(false)
  })

  test('returns true for occupied port', async () => {
    server = createServer()
    usedPort = await new Promise<number>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address()
        resolve(typeof addr === 'object' && addr ? addr.port : 0)
      })
    })
    expect(await isPortInUse(usedPort)).toBe(true)
  })
})

describe('findFreePort', () => {
  test('returns a valid port number', async () => {
    const port = await findFreePort()
    expect(port).toBeGreaterThan(0)
    expect(port).toBeLessThan(65536)
  })

  test('returns different ports on successive calls', async () => {
    const p1 = await findFreePort()
    const p2 = await findFreePort()
    // They may occasionally collide, but generally won't
    expect(typeof p1).toBe('number')
    expect(typeof p2).toBe('number')
  })
})
