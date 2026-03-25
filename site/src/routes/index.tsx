import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/')({
  component: Landing,
  head: () => ({
    meta: [
      { title: 'QUESTPIE Probe — Dev Testing CLI for AI Agents' },
      {
        name: 'description',
        content:
          'Your AI agent writes code. Probe verifies it works. Process management, log checking, HTTP testing, browser control, test recording.',
      },
      { property: 'og:title', content: 'QUESTPIE Probe — Dev Testing CLI for AI Agents' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://probe.questpie.com' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

const S = {
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
  sans: "'Geist Variable', 'Geist', 'Inter', sans-serif",
  bg: '#0A0A0A',
  card: '#111111',
  border: '#333333',
  fg: '#E5E5E5',
  muted: '#999999',
  dim: '#555555',
  purple: '#B700FF',
  green: '#00E676',
  cyan: '#40C4FF',
} as const

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 10V2H2V22H10" stroke="#fff" strokeWidth="2" strokeLinecap="square" />
      <path d="M23 13H13V23H23V13Z" fill={S.purple} />
    </svg>
  )
}

// ── Animated Terminal ───────────────────────────

type LineType = 'think' | 'cmd' | 'ok' | 'data' | 'ref' | 'blank'

const LINES: Array<{ t: LineType; text: string }> = [
  { t: 'think', text: 'I just implemented user filtering.' },
  { t: 'think', text: 'Let me verify it actually works.' },
  { t: 'blank', text: '' },
  { t: 'cmd', text: '$ qprobe start server "bun dev" \\' },
  { t: 'cmd', text: '    --ready "ready on" --port 3000' },
  { t: 'ok', text: '✔ Started "server" (PID 24601)' },
  { t: 'blank', text: '' },
  { t: 'cmd', text: '$ qprobe logs server --grep "ERROR"' },
  { t: 'data', text: '  (no errors)' },
  { t: 'blank', text: '' },
  { t: 'cmd', text: '$ qprobe http GET /api/users --status 200' },
  { t: 'ok', text: '✔ 200 OK (12ms)' },
  { t: 'blank', text: '' },
  { t: 'cmd', text: '$ qprobe browser open /users' },
  { t: 'ok', text: '✔ Opened http://localhost:3000/users' },
  { t: 'cmd', text: '$ qprobe browser snapshot -i' },
  { t: 'ref', text: '- textbox "Filter" [ref=@e1]' },
  { t: 'ref', text: '- table "Users" (2 rows) [ref=@e2]' },
  { t: 'blank', text: '' },
  { t: 'cmd', text: '$ qprobe browser fill @e1 "Ali"' },
  { t: 'ok', text: '✔ Filled @e1' },
  { t: 'cmd', text: '$ qprobe browser snapshot --diff' },
  { t: 'ref', text: 'CHANGED: table (2 → 1 row)' },
  { t: 'blank', text: '' },
  { t: 'cmd', text: '$ qprobe assert no-errors' },
  { t: 'ok', text: '✔ No JS errors' },
  { t: 'blank', text: '' },
  { t: 'think', text: 'Filter works. Recording for regression.' },
  { t: 'cmd', text: '$ qprobe record stop' },
  { t: 'ok', text: '✔ → user-filter.spec.ts' },
  { t: 'cmd', text: '$ qprobe replay --all' },
  { t: 'ok', text: '✔ 3/3 passed (0 AI tokens)' },
]

const LINE_COLORS: Record<LineType, string> = {
  think: S.cyan,
  cmd: S.fg,
  ok: S.green,
  data: S.dim,
  ref: '#D44FFF',
  blank: 'transparent',
}

function Terminal() {
  const [visible, setVisible] = useState(0)
  const scrollRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (visible >= LINES.length) return
    const line = LINES[visible]
    const delay = line?.t === 'cmd' ? 500 : line?.t === 'think' ? 700 : line?.t === 'blank' ? 150 : 100
    const timer = setTimeout(() => setVisible((v) => v + 1), delay)
    return () => clearTimeout(timer)
  }, [visible])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [visible])

  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', height: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${S.border}`, gap: 8, flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, background: '#FF3D57' }} />
        <div style={{ width: 8, height: 8, background: '#FFB300' }} />
        <div style={{ width: 8, height: 8, background: S.green }} />
        <span style={{ fontFamily: S.mono, fontSize: 11, color: S.dim, marginLeft: 8 }}>
          AI agent
        </span>
      </div>
      <pre
        ref={scrollRef}
        className="term-scroll"
        style={{
          fontFamily: S.mono,
          fontSize: 12,
          lineHeight: 1.65,
          padding: '14px 16px',
          margin: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          flex: 1,
          minHeight: 0,
        }}
      >
        {LINES.slice(0, visible).map((line, i) => {
          if (line.t === 'think') {
            return (
              <div key={i} style={{ color: S.cyan, fontStyle: 'italic', opacity: 0.8 }}>
                {'> '}{line.text}
              </div>
            )
          }
          return (
            <div key={i} style={{ color: LINE_COLORS[line.t] }}>
              {line.text || '\u00A0'}
            </div>
          )
        })}
        {visible < LINES.length && (
          <span style={{ color: S.purple, animation: 'blink 1s infinite' }}>_</span>
        )}
      </pre>
      <style>{`
        @keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}
        .term-scroll::-webkit-scrollbar{width:4px}
        .term-scroll::-webkit-scrollbar-track{background:transparent}
        .term-scroll::-webkit-scrollbar-thumb{background:#333;border-radius:0}
        .term-scroll::-webkit-scrollbar-thumb:hover{background:#555}
        .term-scroll{scrollbar-width:thin;scrollbar-color:#333 transparent}
      `}</style>
    </div>
  )
}

// ── Page ────────────────────────────────────────

function Landing() {
  return (
    <div style={{ background: S.bg, color: S.fg, minHeight: '100vh', fontFamily: S.sans }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '14px 0', background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${S.border}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo />
            <span style={{ fontFamily: S.mono, fontWeight: 700, fontSize: 13, letterSpacing: '-0.05em' }}>QUESTPIE</span>
            <span style={{ fontFamily: S.mono, fontSize: 13, color: S.muted }}>Probe</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/docs" style={{ fontFamily: S.mono, fontSize: 12, color: S.muted, textDecoration: 'none' }}>Docs</Link>
            <a href="https://github.com/questpie/probe" style={{ fontFamily: S.mono, fontSize: 12, color: S.muted, textDecoration: 'none' }}>GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero — 2 columns, terminal matches left height */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 24px 64px', borderBottom: `1px solid ${S.border}` }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontFamily: S.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: S.purple, marginBottom: 20 }}>
              Dev Testing CLI for AI Agents
            </p>
            <h1 style={{ fontFamily: S.mono, fontSize: 32, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.04em', marginBottom: 20 }}>
              Agent writes code.
              <br />
              Probe verifies it works.
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: S.muted, marginBottom: 28, maxWidth: 420 }}>
              Start servers, check logs, test APIs, control the browser, assert state, record the flow. Replay it forever with zero AI tokens.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${S.border}` }}>
                <code style={{ fontFamily: S.mono, fontSize: 13, padding: '10px 16px', background: S.card }}>
                  <span style={{ color: S.dim }}>$</span> bun add -g <span style={{ color: S.purple }}>@questpie/probe</span>
                </code>
              </div>
              <Link to="/docs" style={{ display: 'inline-flex', alignItems: 'center', fontFamily: S.mono, fontSize: 13, fontWeight: 600, padding: '0 20px', background: S.purple, color: '#fff', textDecoration: 'none' }}>
                Docs
              </Link>
            </div>
          </div>
          <Terminal />
        </div>
      </section>

      {/* The feedback loop */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', borderBottom: `1px solid ${S.border}`, overflow: 'hidden' }}>
        <h2 style={{ fontFamily: S.mono, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>
          The feedback loop
        </h2>
        <p style={{ fontSize: 15, color: S.muted, marginBottom: 40, maxWidth: 640, lineHeight: 1.7 }}>
          AI agent implements a feature. Probe checks it in the running app. If it works — record. Replay on every future change. No manual testing.
        </p>
        <div className="loop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: S.border, border: `1px solid ${S.border}` }}>
          {[
            { num: '01', title: 'Code', desc: 'Agent implements a feature or fixes a bug.', cmd: 'git commit -m "add filter"' },
            { num: '02', title: 'Verify', desc: 'Probe checks logs, API, browser state.', cmd: 'qprobe check && qprobe assert no-errors' },
            { num: '03', title: 'Record', desc: 'Capture the working flow as a test.', cmd: 'qprobe record stop → filter.spec.ts' },
            { num: '04', title: 'Replay', desc: 'Run all tests. Zero AI tokens.', cmd: 'qprobe replay --all → 12/12 passed' },
          ].map((step) => (
            <div key={step.num} style={{ padding: '24px 20px', background: S.card }}>
              <p style={{ fontFamily: S.mono, fontSize: 10, fontWeight: 700, color: S.purple, marginBottom: 10 }}>{step.num}</p>
              <h4 style={{ fontFamily: S.mono, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{step.title}</h4>
              <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.5, marginBottom: 12 }}>{step.desc}</p>
              <code style={{ fontFamily: S.mono, fontSize: 11, display: 'block', padding: '6px 10px', background: S.bg, border: `1px solid ${S.border}`, color: S.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {step.cmd}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', borderBottom: `1px solid ${S.border}` }}>
        <h2 style={{ fontFamily: S.mono, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 48 }}>
          What it does
        </h2>
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: S.border, border: `1px solid ${S.border}` }}>
          {[
            { label: 'PROCESS', title: 'Start, stop, restart', desc: 'Daemon processes with ready detection. PID management. Compose with dependency graph.' },
            { label: 'LOGS', title: 'Aggregate & filter', desc: 'Timestamped logs from every service. Grep, level filter, follow mode. Merged view.' },
            { label: 'HTTP', title: 'Request & assert', desc: 'GET/POST/PUT/DELETE with auto baseUrl. Status assertions. JQ filters. Bearer tokens.' },
            { label: 'BROWSER', title: 'Control & inspect', desc: 'A11y tree snapshots with @refs. Click, fill, type. Console, errors, network.' },
            { label: 'RECORD', title: 'Capture & replay', desc: 'Record browser actions. Auto-generate Playwright tests. Replay with zero AI tokens.' },
            { label: 'ASSERT', title: 'Verify state', desc: 'Text, element, URL, title, HTTP status, no-errors, no-network-errors. Exit 1 on fail.' },
          ].map((f) => (
            <div key={f.label} style={{ padding: 28, background: S.card }}>
              <p style={{ fontFamily: S.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: S.purple, marginBottom: 10 }}>{f.label}</p>
              <h4 style={{ fontFamily: S.mono, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{f.title}</h4>
              <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '96px 24px' }}>
        <h2 style={{ fontFamily: S.mono, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
          Close the feedback loop.
        </h2>
        <p style={{ fontSize: 15, color: S.muted, marginBottom: 32, maxWidth: 520, lineHeight: 1.7 }}>
          Install the CLI. Add the skill to your agent. The next feature your agent writes gets verified automatically — logs checked, API tested, browser inspected, test recorded.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/docs" style={{ display: 'inline-block', fontFamily: S.mono, fontSize: 13, fontWeight: 600, padding: '14px 28px', background: S.purple, color: '#fff', textDecoration: 'none' }}>
            Read the Docs
          </Link>
          <a href="https://github.com/questpie/probe" style={{ display: 'inline-block', fontFamily: S.mono, fontSize: 13, fontWeight: 600, padding: '14px 28px', border: `1px solid ${S.border}`, color: S.fg, textDecoration: 'none' }}>
            GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 0', borderTop: `1px solid ${S.border}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: S.mono, fontSize: 11, color: '#444' }}>QUESTPIE Probe — MIT License</p>
          <a href="https://github.com/questpie/probe" style={{ fontFamily: S.mono, fontSize: 11, color: S.muted, textDecoration: 'none' }}>GitHub</a>
        </div>
      </footer>

      {/* Responsive */}
      <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .loop-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .loop-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
