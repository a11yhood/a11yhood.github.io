import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE_PATH,
  SocialMeta,
  buildSearchDescription,
  safeDecode,
  stripMarkdown,
  toAbsoluteUrl,
  truncate,
} from './socialMetaCore'

/** Returns parsed JSON, or null when the resource is missing/unavailable. */
export type FetchJson = (path: string) => Promise<Record<string, unknown> | null>

type RouteInput = {
  /** Request URL of the page being shared, e.g. https://a11yhood.org/product/foo */
  requestUrl: string
  /** Base URL of the backend API, without trailing slash. */
  apiBaseUrl: string
  fetchJson: FetchJson
}

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined

const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

function imageFromId(imageId: unknown, apiBaseUrl: string): string | undefined {
  const id = str(imageId)
  return id ? `${apiBaseUrl}/api/images/${encodeURIComponent(id)}` : undefined
}

function resolveImage(value: string | undefined, apiBaseUrl: string): string | undefined {
  if (!value || value.startsWith('data:')) return undefined
  // Internal references like /api/images/<id> are relative to the API, not the frontend origin.
  return toAbsoluteUrl(value, apiBaseUrl)
}

/**
 * Work out the social metadata for a route. Returns null for routes that should
 * keep the static defaults from index.html (unknown routes, missing content,
 * API failures), so a backend hiccup never breaks the page itself.
 */
export async function resolveSocialMeta({
  requestUrl,
  apiBaseUrl,
  fetchJson,
}: RouteInput): Promise<SocialMeta | null> {
  const url = new URL(requestUrl)
  const origin = url.origin
  const pageUrl = `${origin}${url.pathname}${url.search}`
  const fallbackImage = `${origin}${DEFAULT_IMAGE_PATH}`
  const [, section, rawSlug] = url.pathname.split('/')
  const slug = rawSlug ? safeDecode(rawSlug) : undefined

  if (section === 'product' && slug) {
    const product = await fetchJson(`/api/products/slug/${encodeURIComponent(slug)}`)
    if (!product || product.banned === true) return null
    const name = str(product.name)
    if (!name) return null
    return {
      title: `${name} | a11yhood`,
      description: truncate(stripMarkdown(str(product.description) || DEFAULT_DESCRIPTION)),
      image:
        resolveImage(str(product.image_url), apiBaseUrl) ||
        imageFromId(product.image_id, apiBaseUrl) ||
        fallbackImage,
      imageAlt: str(product.image_alt),
      url: pageUrl,
      type: 'website',
    }
  }

  if (section === 'blog' && slug) {
    const post = await fetchJson(`/api/blog-posts/slug/${encodeURIComponent(slug)}`)
    if (!post || post.published === false) return null
    const title = str(post.title)
    if (!title) return null
    const source = stripMarkdown(str(post.excerpt) || str(post.content) || '')
    return {
      title: `${title} | a11yhood blog`,
      description: truncate(source || DEFAULT_DESCRIPTION),
      image: resolveImage(str(post.header_image), apiBaseUrl) || fallbackImage,
      imageAlt: str(post.header_image_alt),
      url: pageUrl,
      type: 'article',
    }
  }

  if (section === 'collections' && slug) {
    const collection = await fetchJson(`/api/collections/${encodeURIComponent(slug)}`)
    if (!collection || collection.is_public === false) return null
    const name = str(collection.name)
    if (!name) return null

    let image: string | undefined
    const firstProductSlug = strList(collection.product_slugs)[0]
    if (firstProductSlug) {
      const product = await fetchJson(`/api/products/slug/${encodeURIComponent(firstProductSlug)}`)
      if (product) {
        image =
          resolveImage(str(product.image_url), apiBaseUrl) ||
          imageFromId(product.image_id, apiBaseUrl)
      }
    }

    const owner = str(collection.user_name) || 'the a11yhood community'
    return {
      title: `${name} | a11yhood collection`,
      description: truncate(
        stripMarkdown(str(collection.description) || `A collection by ${owner}.`)
      ),
      image: image || fallbackImage,
      url: pageUrl,
      type: 'website',
    }
  }

  if (url.pathname === '/products') {
    const query = (url.searchParams.get('q') || '').trim()
    return {
      title: query ? `Search: ${query} | a11yhood` : 'Search products | a11yhood',
      description: buildSearchDescription(url.searchParams),
      image: fallbackImage,
      url: pageUrl,
      type: 'website',
    }
  }

  if (url.pathname === '/blog') {
    return {
      title: 'Blog | a11yhood',
      description: 'Read stories, guides, and updates from the a11yhood community.',
      image: fallbackImage,
      url: pageUrl,
      type: 'website',
    }
  }

  if (url.pathname === '/collections') {
    return {
      title: 'Collections | a11yhood',
      description: 'Explore curated accessibility collections from the a11yhood community.',
      image: fallbackImage,
      url: pageUrl,
      type: 'website',
    }
  }

  return null
}
