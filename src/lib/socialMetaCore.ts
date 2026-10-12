// Pure helpers for building and injecting social-preview metadata.
// Deliberately free of app imports so they can run in Vercel Routing Middleware.

export type SocialMeta = {
  title: string
  description: string
  image: string
  imageAlt?: string
  url: string
  type: 'website' | 'article'
}

export const DEFAULT_TITLE = 'a11yhood'
export const DEFAULT_DESCRIPTION =
  'Discover and share accessible products, collections, and stories on a11yhood.'
export const DEFAULT_IMAGE_PATH = '/favicon.ico'

/** Reduce markdown to plain text for use in a description. */
export function stripMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/(\*\*|__|\*|_)(\S(?:.*?\S)?)\1/g, '$2')
    .replace(/`+/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncate(value: string, maxLength = 180): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

export function toAbsoluteUrl(value: string | null | undefined, base: string): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value, base).toString()
  } catch {
    return undefined
  }
}

/** Decode a path segment, returning undefined instead of throwing on malformed input. */
export function safeDecode(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment)
  } catch {
    return undefined
  }
}

export function buildSearchDescription(params: URLSearchParams): string {
  const query = (params.get('q') || '').trim()
  const tags = params.getAll('tag').filter(Boolean)
  const sources = params.getAll('source').filter(Boolean)
  const minRating = params.get('minRating')

  const details: string[] = []
  if (tags.length > 0) details.push(`tags: ${tags.join(', ')}`)
  if (sources.length > 0) details.push(`sources: ${sources.join(', ')}`)
  if (minRating) details.push(`minimum rating: ${minRating}`)

  const label = query ? `Search results for “${query}”` : 'Product search results'
  return details.length === 0
    ? `${label} on a11yhood.`
    : `${label} on a11yhood filtered by ${details.join('; ')}.`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMetaTags(meta: SocialMeta): string {
  const hasRichImage = !meta.image.endsWith('.ico')
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    `<meta property="og:site_name" content="a11yhood" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:card" content="${hasRichImage ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
  ]
  if (meta.imageAlt) {
    tags.push(`<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt)}" />`)
    tags.push(`<meta name="twitter:image:alt" content="${escapeHtml(meta.imageAlt)}" />`)
  }
  return tags.join('\n    ')
}

const REPLACEABLE_TAGS: RegExp[] = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name=["']description["'][^>]*>\s*/gi,
  /<meta\s+(?:property|name)=["'](?:og|twitter):[^"']*["'][^>]*>\s*/gi,
  /<link\s+rel=["']canonical["'][^>]*>\s*/gi,
]

/** Replace the page's title/description/OG/Twitter/canonical tags with `meta`. */
export function injectMeta(html: string, meta: SocialMeta): string {
  let out = html
  for (const pattern of REPLACEABLE_TAGS) out = out.replace(pattern, '')
  const block = `    ${renderMetaTags(meta)}\n`
  return out.includes('</head>') ? out.replace('</head>', `${block}  </head>`) : block + out
}
