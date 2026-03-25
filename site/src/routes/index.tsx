import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({
  component: Landing,
  head: () => ({
    meta: [
      { title: 'QUESTPIE Probe — Dev Testing CLI for AI Agents' },
      {
        name: 'description',
        content:
          'Your AI agent writes code. Probe verifies it works. Process management, log checking, HTTP testing, browser control, test recording. All from the terminal.',
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

const TERM_LINES = [
  { type: 'dim', text: '# Agent just implemented a user filter feature...' },
  { type: 'dim', text: '# Now verifying it actually works:' },
  { type: 'blank', text: '' },
  { type: 'cmd', text: '$ qprobe start server "bun dev" \\' },
  { type: 'cmd', text: '    --ready "ready on" --port 3000' },
  { type: 'ok', text: '✔ Started "server" (PID 24601)' },
  { type: 'blank', text: '' },
  { type: 'cmd', text: '$ qprobe logs server --grep "ERROR"' },
  { type: 'dim', text: '  (no errors)' },
  { type: 'blank', text: '' },
  { type: 'cmd', text: '$ qprobe http GET /api/users \\' },
  { type: 'cmd', text: '    --status 200' },
  { type: 'ok', text: '✔ 200 OK (12ms)' },
  { type: 'json', text: '[{"id":1,"name":"Alice"},{"id":2}]' },
  { type: 'blank', text: '' },
  { type: 'cmd', text: '$ qprobe browser open /users' },
  { type: 'ok', text: '✔ Opened http://localhost:3000/users' },
  { type: 'cmd', text: '$ qprobe browser snapshot -i' },
  { type: 'ref', text: '- textbox "Filter" [ref=@e1]' },
  { type: 'ref', text: '- table "Users" (2 rows) [ref=@e2]' },
  { type: 'ref', text: '- button "Clear" [ref=@e3]' },
  { type: 'blank', text: '' },
  { type: 'cmd', text: '$ qprobe browser fill @e1 "Ali"' },
  { type: 'ok', text: '✔ Filled @e1' },
  { type: 'cmd', text: '$ qprobe browser snapshot --diff' },
  { type: 'ref', text: 'CHANGED: table (2 rows → 1 row)' },
  { type: 'blank', text: '' },
  { type: 'cmd', text: '$ qprobe assert no-errors' },
  { type: 'ok', text: '✔ No JS errors' },
  { type: 'blank', text: '' },
  { type: 'dim', text: '# It works. Record it.' },
  { type: 'cmd', text: '$ qprobe record stop' },
  { type: 'ok', text: '✔ → user-filter.spec.ts' },
  { type: 'cmd', text: '$ qprobe replay --all' },
  { type: 'ok', text: '✔ 3/3 passed (0 AI tokens)' },
]

const colors: Record<string, string> = {
  cmd: '#E5E5E5',
  ok: '#00E676',
  err: '#FF3D57',
  json: '#999',
  ref: '#D44FFF',
  dim: '#555',
  blank: 'transparent',
}

function Terminal() {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    if (visibleLines >= TERM_LINES.length) return
    const delay = TERM_LINES[visibleLines]?.type === 'cmd' ? 600 : TERM_LINES[visibleLines]?.type === 'blank' ? 200 : 120
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), delay)
    return () => clearTimeout(timer)
  }, [visibleLines])

  return (
    <div style={{ background: '#111', border: '1px solid #333', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid #333',
          gap: 8,
        }}
      >
        <div style={{ width: 8, height: 8, background: '#FF3D57' }} />
        <div style={{ width: 8, height: 8, background: '#FFB300' }} />
        <div style={{ width: 8, height: 8, background: '#00E676' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555', marginLeft: 8 }}>
          AI agent verifying a feature
        </span>
      </div>
      <pre
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          lineHeight: 1.7,
          padding: '16px 20px',
          margin: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          maxHeight: 420,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {TERM_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{ color: colors[line.type] ?? '#999' }}>
            {line.text || '\u00A0'}
          </div>
        ))}
        {visibleLines < TERM_LINES.length && (
          <span style={{ color: '#B700FF', animation: 'blink 1s infinite' }}>_</span>
        )}
      </pre>
      <style>{`@keyframes blink { 0%,50% { opacity: 1 } 51%,100% { opacity: 0 } }`}</style>
    </div>
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
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px 72px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div>
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
                fontSize: 32,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '-0.04em',
                marginBottom: 20,
              }}
            >
              Agent writes code.
              <br />
              Probe verifies it works.
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: '#999', marginBottom: 32, maxWidth: 420 }}>
              Start servers, check logs, test APIs, control the browser, assert state, record the flow.
              Replay it forever with zero AI tokens.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #333',
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
              <Link
                to="/docs"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0 20px',
                  background: '#B700FF',
                  color: '#fff',
                  textDecoration: 'none',
                }}
              >
                Docs
              </Link>
            </div>
          </div>
          <Terminal />
        </div>
      </section>

      {/* The Loop */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', borderBottom: '1px solid #333' }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}
        >
          The feedback loop
        </h2>
        <p style={{ fontSize: 15, color: '#999', marginBottom: 40, maxWidth: 640, lineHeight: 1.7 }}>
          AI agent writes a feature. Probe checks it actually works in the running app.
          If it works, record the flow. Replay on every future change. No manual testing. No copy-pasting console errors.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            background: '#333',
            border: '1px solid #333',
          }}
        >
          {[
            { num: '01', title: 'Code', desc: 'Agent implements a feature or fixes a bug.', cmd: 'git commit -m "add user filter"' },
            { num: '02', title: 'Verify', desc: 'Probe checks logs, API, browser. No guessing.', cmd: 'qprobe check && qprobe assert no-errors' },
            { num: '03', title: 'Record', desc: 'Capture the working flow as a Playwright test.', cmd: 'qprobe record stop → user-filter.spec.ts' },
            { num: '04', title: 'Replay', desc: 'Run all recordings on every change. Zero tokens.', cmd: 'qprobe replay --all → 12/12 passed' },
          ].map((step) => (
            <div key={step.num} style={{ padding: '28px 24px', background: '#111' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#B700FF', marginBottom: 12 }}>
                {step.num}
              </p>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                {step.title}
              </h4>
              <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6, marginBottom: 12 }}>{step.desc}</p>
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  display: 'block',
                  padding: '8px 10px',
                  background: '#0A0A0A',
                  border: '1px solid #333',
                  color: '#999',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {step.cmd}
              </code>
            </div>
          ))}
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
            { label: 'LOGS', title: 'Aggregate & filter', desc: 'Timestamped logs from every service. Grep, level filter, follow mode. Merged view.' },
            { label: 'HTTP', title: 'Request & assert', desc: 'GET/POST/PUT/DELETE with auto baseUrl. Status assertions. JQ filters. Bearer tokens.' },
            { label: 'BROWSER', title: 'Control & inspect', desc: 'A11y tree snapshots with @refs. Click, fill, type. Console, errors, network. Screenshots.' },
            { label: 'RECORD', title: 'Capture & replay', desc: 'Record browser actions. Auto-generate Playwright tests. Replay with zero AI tokens.' },
            { label: 'ASSERT', title: 'Verify state', desc: 'Text, element, URL, title, HTTP status, no-errors, no-network-errors. Exit 1 on fail.' },
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
          Close the feedback loop.
        </h2>
        <p style={{ fontSize: 15, color: '#999', marginBottom: 32, maxWidth: 520, lineHeight: 1.7 }}>
          Install the CLI. Add the skill to your agent. The next feature your agent writes gets verified automatically —
          logs checked, API tested, browser inspected, test recorded.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
          <a
            href="https://github.com/questpie/probe"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              padding: '14px 28px',
              border: '1px solid #333',
              color: '#E5E5E5',
              textDecoration: 'none',
            }}
          >
            GitHub
          </a>
        </div>
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
