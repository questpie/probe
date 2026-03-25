import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import type * as React from 'react'

import appCss from '@/styles/app.css?url'

export const Route = createRootRoute({
  head: () => {
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#0a0a0a' },
        { name: 'msapplication-TileColor', content: '#0a0a0a' },
      ],
      scripts: [
        {
          src: 'https://umami.eu-infra.questpie.com/script.js',
          'data-website-id': '9a036790-c25d-4b92-86a8-e3e242e63284',
          defer: true,
        },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      ],
    }
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <RootProvider>{children}</RootProvider>
        <Scripts />
      </body>
    </html>
  )
}
