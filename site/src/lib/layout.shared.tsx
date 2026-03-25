import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 10V2H2V22H10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        <path d="M23 13H13V23H23V13Z" fill="#B700FF" />
      </svg>
      <span className="font-mono text-sm font-bold tracking-[-0.05em]">
        QUESTPIE<span className="text-primary"> Probe</span>
      </span>
    </div>
  )
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      url: '/',
      title: <Logo />,
      transparentMode: 'always',
    },
    links: [
      {
        text: 'GitHub',
        url: 'https://github.com/questpie/probe',
        external: true,
      },
    ],
  }
}
