import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Landing,
  head: () => ({
    meta: [
      { title: 'QUESTPIE Probe — Dev Testing CLI for AI Agents' },
      {
        name: 'description',
        content:
          'Process orchestration, log aggregation, browser control, HTTP testing, and test recording. All from the terminal.',
      },
    ],
  }),
})

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 10V2H2V22H10" stroke="#fff" strokeWidth="2" strokeLinecap="square" />
      <path d="M23 13H13V23H23V13Z" fill="#B700FF" />
    </svg>
  )
}

function Landing() {
  return (
    <div style={{ background: '#0A0A0A', color: '#E5E5E5', minHeight: '100vh' }}>
      {/* Nav */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '14px 0',
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #333',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, letterSpacing: '-0.05em' }}>
              QUESTPIE
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#999' }}>Probe</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/docs" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#999', textDecoration: 'none' }}>
              Docs
            </Link>
            <a
              href="https://github.com/questpie/probe"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#999', textDecoration: 'none' }}
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '96px 24px 72px', borderBottom: '1px solid #333' }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#B700FF',
            marginBottom: 20,
          }}
        >
          Dev Testing CLI for AI Agents
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.04em',
            marginBottom: 20,
          }}
        >
          Your AI agent can finally
          <br />
          test the running app.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#999', marginBottom: 32, maxWidth: 480 }}>
          Process orchestration, log aggregation, browser control, HTTP requests, and test recording.
          All from the terminal. Zero MCP overhead.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #333',
            width: 'fit-content',
          }}
        >
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '12px 20px',
              background: '#111',
            }}
          >
            <span style={{ color: '#999' }}>$</span> bun add -g{' '}
            <span style={{ color: '#B700FF' }}>@questpie/probe</span>
          </code>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', borderBottom: '1px solid #333' }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginBottom: 48,
          }}
        >
          What it does
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            background: '#333',
            border: '1px solid #333',
          }}
        >
          {[
            { label: 'PROCESS', title: 'Start, stop, restart', desc: 'Daemon processes with ready detection. PID management. Compose with dependency graph.' },
            { label: 'LOGS', title: 'Aggregate & filter', desc: 'Timestamped logs. Grep, level filter, follow mode. Merged view across all services.' },
            { label: 'HTTP', title: 'Request & assert', desc: 'GET/POST/PUT/DELETE with auto baseUrl. Status assertions. JQ filters. Bearer tokens.' },
            { label: 'BROWSER', title: 'Control & inspect', desc: 'A11y tree snapshots. Click, fill, type. Console, errors, network. Screenshots.' },
            { label: 'RECORD', title: 'Capture & replay', desc: 'Record browser actions. Generate Playwright tests. Replay with zero AI tokens.' },
            { label: 'ASSERT', title: 'Verify state', desc: 'Text, element, URL, title, status code, no-errors, no-network-errors assertions.' },
          ].map((f) => (
            <div key={f.label} style={{ padding: 28, background: '#111' }}>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#B700FF',
                  marginBottom: 10,
                }}
              >
                {f.label}
              </p>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                {f.title}
              </h4>
              <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '96px 24px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}
        >
          Get started in 30 seconds
        </h2>
        <p style={{ fontSize: 15, color: '#999', marginBottom: 32, maxWidth: 480, lineHeight: 1.7 }}>
          Install globally, init config, start your stack. Read the docs for the full command reference.
        </p>
        <Link
          to="/docs"
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 600,
            padding: '14px 28px',
            background: '#B700FF',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          Read the Docs
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 0', borderTop: '1px solid #333' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444' }}>
            QUESTPIE Probe — MIT License
          </p>
          <a
            href="https://github.com/questpie/probe"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#999', textDecoration: 'none' }}
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
