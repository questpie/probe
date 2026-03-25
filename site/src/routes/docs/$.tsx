import { createFileRoute } from '@tanstack/react-router'
import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { DocsPage, DocsBody } from 'fumadocs-ui/page'
import defaultComponents from 'fumadocs-ui/mdx'

export const Route = createFileRoute('/docs/$')({
  component: DocsRoute,
  head: ({ params }) => {
    const slugs = (params as { _splat?: string })._splat?.split('/').filter(Boolean) ?? []
    const page = source.getPage(slugs)
    if (!page) return { meta: [{ title: 'Not Found | QUESTPIE Probe' }] }
    return {
      meta: [
        { title: `${page.data.title} | QUESTPIE Probe Docs` },
        { name: 'description', content: page.data.description ?? '' },
      ],
    }
  },
})

function DocsRoute() {
  const params = Route.useParams() as { _splat?: string }
  const slugs = params._splat?.split('/').filter(Boolean) ?? []
  const page = source.getPage(slugs)

  if (!page) {
    return (
      <DocsLayout tree={source.pageTree} nav={{ title: 'QUESTPIE Probe' }}>
        <DocsPage>
          <DocsBody>
            <h1>Page not found</h1>
            <p>The requested documentation page does not exist.</p>
          </DocsBody>
        </DocsPage>
      </DocsLayout>
    )
  }

  const MDX = page.data.body

  return (
    <DocsLayout tree={source.pageTree} nav={{ title: 'QUESTPIE Probe' }}>
      <DocsPage toc={page.data.toc}>
        <DocsBody>
          <h1>{page.data.title}</h1>
          <MDX components={{ ...defaultComponents }} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  )
}
