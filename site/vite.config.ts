import mdx from 'fumadocs-mdx/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 3200 },
  plugins: [
    mdx(await import('./source.config')),
    nitro({ preset: 'bun' }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: !process.env.DISABLE_PRERENDER,
        routes: ['/'],
        crawlLinks: false,
      },
    }),
    viteReact(),
  ],
})
