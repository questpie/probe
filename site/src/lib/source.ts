import { loader } from 'fumadocs-core/source'
import collections from 'fumadocs-mdx:collections/browser'

export const source = loader({
  source: collections.docs.toFumadocsSource(),
  baseUrl: '/docs',
})
