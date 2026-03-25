import { createServer } from 'node:http'

const port = Number(process.env.PORT ?? 4444)

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
  })
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/'
  const method = req.method ?? 'GET'

  // Health
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  // Slow endpoint (responds after 2s)
  if (url === '/api/slow') {
    await new Promise((r) => setTimeout(r, 2000))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'slow-ok' }))
    return
  }

  // Echo headers
  if (url === '/api/echo-headers') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(req.headers))
    return
  }

  // Users CRUD
  if (url === '/api/users' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(users))
    return
  }

  if (url === '/api/users' && method === 'POST') {
    const body = await readBody(req)
    const data = JSON.parse(body) as Record<string, unknown>
    res.writeHead(201, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ id: 3, ...data }))
    return
  }

  if (url === '/api/users/1' && method === 'PUT') {
    const body = await readBody(req)
    const data = JSON.parse(body) as Record<string, unknown>
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ id: 1, ...data }))
    return
  }

  if (url === '/api/users/1' && method === 'DELETE') {
    res.writeHead(204)
    res.end()
    return
  }

  // Nested JSON for jq tests
  if (url === '/api/nested') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        data: {
          items: [
            { name: 'first', value: 10 },
            { name: 'second', value: 20 },
          ],
          total: 2,
        },
      }),
    )
    return
  }

  // Server error
  if (url === '/api/error') {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal Server Error' }))
    return
  }

  // Error log line (for testing log level detection)
  if (url === '/api/trigger-error-log') {
    console.error('ERROR: simulated failure in handler')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ logged: true }))
    return
  }

  // Warning log line
  if (url === '/api/trigger-warn-log') {
    console.warn('WARN: deprecated endpoint called')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ logged: true }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(port, () => {
  console.log(`ready on http://localhost:${port}`)
})
