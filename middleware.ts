// Vercel Routing Middleware: serve the SPA shell with route-specific social
// metadata (Open Graph / Twitter / canonical) so link unfurlers that don't run
// JavaScript see real titles, descriptions, and images.
//
// Any failure falls through to the plain SPA, so previews degrade to the static
// defaults in index.html rather than breaking the page.
import { next } from '@vercel/functions'
import { injectMeta } from './src/lib/socialMetaCore'
import { resolveSocialMeta } from './src/lib/socialMetaRoutes'

export const config = {
  runtime: 'edge',
  matcher: ['/products', '/blog', '/blog/:slug', '/collections', '/collections/:slug', '/product/:slug'],
}

const DEFAULT_API_URL = 'https://backend-a11yhood.vercel.app'
const API_TIMEOUT_MS = 3000

export default async function middleware(request: Request): Promise<Response> {
  if (request.method !== 'GET') return next()

  const apiBaseUrl = (process.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '')

  try {
    const meta = await resolveSocialMeta({
      requestUrl: request.url,
      apiBaseUrl,
      fetchJson: async (path) => {
        const response = await fetch(`${apiBaseUrl}${path}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
        })
        return response.ok ? ((await response.json()) as Record<string, unknown>) : null
      },
    })
    if (!meta) return next()

    const shell = await fetch(new URL('/index.html', request.url))
    if (!shell.ok) return next()

    const html = injectMeta(await shell.text(), meta)
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Short CDN cache keeps previews fresh without hammering the API.
        'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch {
    return next()
  }
}
