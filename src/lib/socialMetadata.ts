import { BlogPost, Collection, Product } from '@/lib/types'
import { pickCollectionImage, resolveCollectionProducts } from '@/lib/collectionUtils'

export type SocialMetadata = {
  title: string
  description: string
  image: string
  url: string
  type: 'website' | 'article'
}

type BuildSocialMetadataOptions = {
  pathname: string
  search: string
  origin: string
  products: Product[]
  blogPosts: BlogPost[]
  collections: Collection[]
}

const DEFAULT_TITLE = 'a11yhood'
const DEFAULT_DESCRIPTION = 'Discover and share accessible products, collections, and stories on a11yhood.'
const DEFAULT_SHARE_IMAGE_PATH = '/favicon.ico'

const stripMarkdown = (value: string): string => value
  .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
  .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
  .replace(/[`*_>#-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const truncate = (value: string, maxLength = 180): string => {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

const toAbsoluteUrl = (value: string | undefined, origin: string): string | undefined => {
  if (!value) return undefined
  try {
    return new URL(value, origin).toString()
  } catch {
    return undefined
  }
}

const hashSeed = (seed: string): number => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const pickRepresentativeSearchImage = (products: Product[], seed: string): string | undefined => {
  const candidates = products.filter((product) => !!product.imageUrl)
  if (candidates.length === 0) return undefined
  const index = hashSeed(seed) % candidates.length
  return candidates[index].imageUrl
}

const routeUrl = (origin: string, pathname: string, search: string): string => `${origin}${pathname}${search}`

const buildSearchDescription = (query: string, params: URLSearchParams): string => {
  const tags = params.getAll('tag').filter(Boolean)
  const sources = params.getAll('source').filter(Boolean)
  const minRating = params.get('minRating')

  const details: string[] = []
  if (tags.length > 0) details.push(`tags: ${tags.join(', ')}`)
  if (sources.length > 0) details.push(`sources: ${sources.join(', ')}`)
  if (minRating) details.push(`minimum rating: ${minRating}`)

  const label = query ? `Search results for “${query}”` : 'Product search results'
  if (details.length === 0) {
    return `${label} on a11yhood.`
  }

  return `${label} on a11yhood filtered by ${details.join('; ')}.`
}

export function buildSocialMetadata({
  pathname,
  search,
  origin,
  products,
  blogPosts,
  collections,
}: BuildSocialMetadataOptions): SocialMetadata {
  const params = new URLSearchParams(search)
  const fallbackImage = `${origin}${DEFAULT_SHARE_IMAGE_PATH}`
  const url = routeUrl(origin, pathname, search)

  if (pathname.startsWith('/product/')) {
    const slug = decodeURIComponent(pathname.slice('/product/'.length))
    const product = products.find((candidate) => candidate.slug === slug || candidate.id === slug)
    if (product) {
      const description = truncate(stripMarkdown(product.description || DEFAULT_DESCRIPTION))
      return {
        title: `${product.name} | a11yhood`,
        description,
        image: toAbsoluteUrl(product.imageUrl, origin) || fallbackImage,
        url,
        type: 'website',
      }
    }
  }

  if (pathname.startsWith('/blog/')) {
    const slug = decodeURIComponent(pathname.slice('/blog/'.length))
    const post = blogPosts.find((candidate) => candidate.slug === slug)
    if (post) {
      const descriptionSource = post.excerpt || stripMarkdown(post.content || '')
      const description = truncate(descriptionSource || DEFAULT_DESCRIPTION)
      return {
        title: `${post.title} | a11yhood blog`,
        description,
        image: toAbsoluteUrl(post.headerImage, origin) || fallbackImage,
        url,
        type: 'article',
      }
    }
  }

  if (pathname.startsWith('/collections/')) {
    const slug = decodeURIComponent(pathname.slice('/collections/'.length))
    const collection = collections.find((candidate) => candidate.slug === slug || candidate.id === slug)
    if (collection) {
      const resolvedProducts = resolveCollectionProducts(collection, collections, products)
      const pickedImage = pickCollectionImage(resolvedProducts)?.imageUrl
      const description = truncate(
        stripMarkdown(
          collection.description || `A collection by ${collection.username || 'the a11yhood community'}.`
        )
      )
      return {
        title: `${collection.name} | a11yhood collection`,
        description,
        image: toAbsoluteUrl(pickedImage, origin) || fallbackImage,
        url,
        type: 'website',
      }
    }
  }

  if (pathname === '/products') {
    const query = (params.get('q') || '').trim()
    const pickedImage = pickRepresentativeSearchImage(products, `${pathname}?${params.toString()}`)
    return {
      title: query ? `Search: ${query} | a11yhood` : 'Search products | a11yhood',
      description: buildSearchDescription(query, params),
      image: toAbsoluteUrl(pickedImage, origin) || fallbackImage,
      url,
      type: 'website',
    }
  }

  if (pathname === '/blog') {
    return {
      title: 'Blog | a11yhood',
      description: 'Read stories, guides, and updates from the a11yhood community.',
      image: fallbackImage,
      url,
      type: 'website',
    }
  }

  if (pathname === '/collections') {
    return {
      title: 'Collections | a11yhood',
      description: 'Explore curated accessibility collections from the a11yhood community.',
      image: fallbackImage,
      url,
      type: 'website',
    }
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: fallbackImage,
    url,
    type: 'website',
  }
}

const ensureMetaTag = (attribute: 'name' | 'property', key: string): HTMLMetaElement => {
  const selector = `meta[${attribute}="${key}"]`
  const existing = document.head.querySelector(selector)
  if (existing instanceof HTMLMetaElement) {
    return existing
  }

  const tag = document.createElement('meta')
  tag.setAttribute(attribute, key)
  document.head.appendChild(tag)
  return tag
}

const setMeta = (attribute: 'name' | 'property', key: string, value: string): void => {
  const tag = ensureMetaTag(attribute, key)
  tag.setAttribute('content', value)
}

const ensureCanonicalLink = (): HTMLLinkElement => {
  const existing = document.head.querySelector('link[rel="canonical"]')
  if (existing instanceof HTMLLinkElement) {
    return existing
  }

  const link = document.createElement('link')
  link.setAttribute('rel', 'canonical')
  document.head.appendChild(link)
  return link
}

export function applySocialMetadata(metadata: SocialMetadata): void {
  if (typeof document === 'undefined') return

  document.title = metadata.title
  const usesFallbackImage = metadata.image.endsWith(DEFAULT_SHARE_IMAGE_PATH)

  setMeta('name', 'description', metadata.description)
  setMeta('property', 'og:title', metadata.title)
  setMeta('property', 'og:description', metadata.description)
  setMeta('property', 'og:type', metadata.type)
  setMeta('property', 'og:url', metadata.url)
  setMeta('property', 'og:image', metadata.image)
  setMeta('name', 'twitter:card', usesFallbackImage ? 'summary' : 'summary_large_image')
  setMeta('name', 'twitter:title', metadata.title)
  setMeta('name', 'twitter:description', metadata.description)
  setMeta('name', 'twitter:image', metadata.image)

  const canonical = ensureCanonicalLink()
  canonical.setAttribute('href', metadata.url)
}
