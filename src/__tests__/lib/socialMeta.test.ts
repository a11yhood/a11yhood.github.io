import { describe, expect, it, vi } from 'vitest'
import { injectMeta, safeDecode, stripMarkdown } from '@/lib/socialMetaCore'
import { resolveSocialMeta, FetchJson } from '@/lib/socialMetaRoutes'

const API = 'https://api.example.com'
const ORIGIN = 'https://a11yhood.example'

const fetchFrom = (routes: Record<string, Record<string, unknown> | null>): FetchJson =>
  vi.fn(async (path: string) => routes[path] ?? null)

describe('stripMarkdown', () => {
  it('removes syntax but keeps hyphens and underscores inside words', () => {
    expect(stripMarkdown('How to **test** [accessibly](/guide)')).toBe('How to test accessibly')
    expect(stripMarkdown('# Heading\n- screen-reader e-mail snake_case')).toBe(
      'Heading screen-reader e-mail snake_case'
    )
  })
})

describe('safeDecode', () => {
  it('returns undefined for malformed escapes instead of throwing', () => {
    expect(safeDecode('%E0%A4%A')).toBeUndefined()
    expect(safeDecode('a%20b')).toBe('a b')
  })
})

describe('injectMeta', () => {
  const html = `<html><head><title>old</title>
    <meta name="description" content="old" />
    <meta property="og:title" content="old" />
    <meta name="twitter:card" content="summary" />
    <link rel="canonical" href="https://old" />
  </head><body></body></html>`

  it('replaces existing tags and escapes values', () => {
    const out = injectMeta(html, {
      title: 'A "quoted" <title>',
      description: 'desc & more',
      image: 'https://a11yhood.example/img.png',
      url: 'https://a11yhood.example/product/x',
      type: 'website',
    })
    expect(out.match(/<title>/g)).toHaveLength(1)
    expect(out.match(/og:title/g)).toHaveLength(1)
    expect(out).toContain('<title>A &quot;quoted&quot; &lt;title&gt;</title>')
    expect(out).toContain('content="desc &amp; more"')
    expect(out).toContain('name="twitter:card" content="summary_large_image"')
    expect(out).not.toContain('content="old"')
  })
})

describe('resolveSocialMeta', () => {
  it('builds product metadata with the API image', async () => {
    const meta = await resolveSocialMeta({
      requestUrl: `${ORIGIN}/product/reader`,
      apiBaseUrl: API,
      fetchJson: fetchFrom({
        '/api/products/slug/reader': {
          name: 'Screen Reader',
          description: 'A **great** reader',
          image_id: 'img-1',
          image_alt: 'Reader UI',
        },
      }),
    })
    expect(meta).toMatchObject({
      title: 'Screen Reader | a11yhood',
      description: 'A great reader',
      image: `${API}/api/images/img-1`,
      imageAlt: 'Reader UI',
      url: `${ORIGIN}/product/reader`,
    })
  })

  it('returns null for missing, banned, or malformed routes', async () => {
    const fetchJson = fetchFrom({ '/api/products/slug/gone': { name: 'X', banned: true } })
    for (const path of ['/product/missing', '/product/gone', '/product/%E0%A4%A', '/about']) {
      expect(
        await resolveSocialMeta({ requestUrl: `${ORIGIN}${path}`, apiBaseUrl: API, fetchJson })
      ).toBeNull()
    }
  })

  it('skips unpublished blog posts', async () => {
    const meta = await resolveSocialMeta({
      requestUrl: `${ORIGIN}/blog/draft`,
      apiBaseUrl: API,
      fetchJson: fetchFrom({ '/api/blog-posts/slug/draft': { title: 'Draft', published: false } }),
    })
    expect(meta).toBeNull()
  })

  it('uses the first product image for collections', async () => {
    const meta = await resolveSocialMeta({
      requestUrl: `${ORIGIN}/collections/faves`,
      apiBaseUrl: API,
      fetchJson: fetchFrom({
        '/api/collections/faves': {
          name: 'Faves',
          description: 'Useful tools',
          product_slugs: ['reader'],
        },
        '/api/products/slug/reader': { name: 'Screen Reader', image_id: 'img-1' },
      }),
    })
    expect(meta?.title).toBe('Faves | a11yhood collection')
    expect(meta?.image).toBe(`${API}/api/images/img-1`)
  })

  it('describes search filters without calling the API', async () => {
    const fetchJson = fetchFrom({})
    const meta = await resolveSocialMeta({
      requestUrl: `${ORIGIN}/products?q=writing&tag=keyboard&source=github&minRating=4`,
      apiBaseUrl: API,
      fetchJson,
    })
    expect(meta?.title).toBe('Search: writing | a11yhood')
    expect(meta?.description).toContain('tags: keyboard')
    expect(meta?.description).toContain('sources: github')
    expect(meta?.description).toContain('minimum rating: 4')
    expect(fetchJson).not.toHaveBeenCalled()
  })
})
