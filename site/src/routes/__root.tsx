import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import '@/styles/app.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
      { name: 'theme-color', content: '#0a0a0a' },
      { title: 'QUESTPIE Probe — Dev Testing CLI for AI Agents' },
      {
        name: 'description',
        content:
          'Dev testing CLI for AI coding agents. Process orchestration, log aggregation, browser control, HTTP testing, and test recording.',
      },
    ],
  }),
  component: () => (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script
          defer
          src="https://umami.eu-infra.questpie.com/script.js"
          data-website-id="9a036790-c25d-4b92-86a8-e3e242e63284"
        />
      </head>
      <body>
        <RootProvider>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  ),
})
