/**
 * Unit tests for the GitHub Pages SPA redirect logic embedded in public/404.html.
 *
 * The 404.html script encodes the current path+search into a query string so that
 * GitHub Pages (which only serves static files) can forward client-side routes to
 * the SPA's index.html.  Because the redirect double-encodes search params, URLs
 * with many query parameters can balloon past server URI length limits (HTTP 414).
 *
 * These tests mirror the script logic so we can verify URL-length guards that
 * first drop the encoded query string while preserving route, then fall back to
 * base path only for extreme route lengths.
 */

import { describe, it, expect } from 'vitest'

/**
 * Pure reimplementation of the redirect logic in public/404.html.
 * The returned string is the `target` the script would pass to `location.replace()`.
 * If the target equals `href` no redirect occurs, so we return `null` in that case.
 */
function computeRedirectTarget(loc: {
  protocol: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  href: string
}): string | null {
  const parts = loc.pathname.split('/')
  const pathSegmentsToKeep = parts[1] === 'pr-preview' && parts[2] ? 2 : 0

  const basePath =
    loc.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
  const routePayload = loc.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/')
  const searchPayload = loc.search ? loc.search.slice(1) : ''
  const encodedRoute = encodeURIComponent(routePayload)
  const encodedSearch = encodeURIComponent(searchPayload)
  const redirectPath =
    basePath + '?/' + encodedRoute + (searchPayload ? '&' + encodedSearch : '')
  let target =
    loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : '') + redirectPath + loc.hash
  const routeTarget =
    loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : '') + basePath + '?/' + encodedRoute + loc.hash

  // Self-redirect loop guard (mirrors 404.html)
  if (target === loc.href) {
    target = loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : '') + basePath + loc.hash
  }

  // URI-length guard (mirrors 404.html): first drop query params but keep route.
  if (target.length > 2000) {
    target = routeTarget
  }

  // Extremely defensive fallback for massive route payloads.
  if (target.length > 6000) {
    target =
      loc.protocol +
      '//' +
      loc.hostname +
      (loc.port ? ':' + loc.port : '') +
      basePath +
      loc.hash
  }

  if (target === loc.href) return null
  return target
}

/**
 * Mirrors the initial redirect computation before loop/length guards.
 * Used in tests to deterministically prove that an input exceeds the 6000-char limit.
 */
function computeInitialRedirectTarget(loc: {
  protocol: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
}): string {
  const parts = loc.pathname.split('/')
  const pathSegmentsToKeep = parts[1] === 'pr-preview' && parts[2] ? 2 : 0

  const basePath =
    loc.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
  const routePayload = loc.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/')
  const searchPayload = loc.search ? loc.search.slice(1) : ''
  const encodedRoute = encodeURIComponent(routePayload)
  const encodedSearch = encodeURIComponent(searchPayload)
  const redirectPath =
    basePath + '?/' + encodedRoute + (searchPayload ? '&' + encodedSearch : '')

  return (
    loc.protocol +
    '//' +
    loc.hostname +
    (loc.port ? ':' + loc.port : '') +
    redirectPath +
    loc.hash
  )
}

// Helper to build a minimal location object
function makeLocation(pathname: string, search = '', hash = ''): Parameters<typeof computeRedirectTarget>[0] {
  const href = 'https://example.github.io' + pathname + search + hash
  return { protocol: 'https:', hostname: 'example.github.io', port: '', pathname, search, hash, href }
}

describe('SPA redirect – normal routes', () => {
  it('redirects /products to /?/products', () => {
    const target = computeRedirectTarget(makeLocation('/products'))
    expect(target).toBe('https://example.github.io/?/products')
  })

  it('redirects /about to /?/about', () => {
    const target = computeRedirectTarget(makeLocation('/about'))
    expect(target).toBe('https://example.github.io/?/about')
  })

  it('preserves short query strings in the redirect', () => {
    const target = computeRedirectTarget(makeLocation('/products', '?type=Software&tag=accessibility'))
    expect(target).not.toBeNull()
    // The encoded search should be included in the redirect
    expect(target).toContain(encodeURIComponent('type=Software&tag=accessibility'))
  })
})

describe('SPA redirect – PR preview paths', () => {
  it('keeps /pr-preview/359 as base path', () => {
    const target = computeRedirectTarget(
      makeLocation('/pr-preview/359/products', '?tag=screen-reader')
    )
    expect(target).toContain('/pr-preview/359/')
    expect(target).toContain(encodeURIComponent('products'))
  })

  it('strips pr-preview path segments from encoded route', () => {
    const target = computeRedirectTarget(makeLocation('/pr-preview/359/blog/my-post'))
    expect(target).toContain('/pr-preview/359/?/')
    expect(target).toContain(encodeURIComponent('blog/my-post'))
  })
})

describe('SPA redirect – URI-length guard', () => {
  it('drops query string but preserves route when redirect URL would exceed 2000 characters', () => {
    // Deterministically build an oversized query payload until the pre-guard target
    // exceeds the 2000-char threshold.
    const params: string[] = []
    let manyParams = ''
    let initialTarget = ''

    for (let i = 0; i < 2000; i++) {
      params.push(`tag=${'x'.repeat(40)}${i}`)
      manyParams = params.join('&')
      initialTarget = computeInitialRedirectTarget(makeLocation('/products', `?${manyParams}`))
      if (initialTarget.length > 2000) {
        break
      }
    }

    expect(initialTarget.length).toBeGreaterThan(2000)

    const loc = makeLocation('/products', `?${manyParams}`)

    const target = computeRedirectTarget(loc)

    // Redirect must still happen (not null)
    expect(target).not.toBeNull()
    // The resulting URL should be route-only and under the primary safety limit.
    expect((target as string).length).toBeLessThanOrEqual(2000)
    // It must still point at the correct route
    expect(target).toContain(encodeURIComponent('products'))
    // It must NOT include the oversized search params
    expect(target).not.toContain(encodeURIComponent(manyParams))
  })

  it('returns a redirect URL under 2000 characters when params are dropped', () => {
    const manyParams = Array.from({ length: 100 }, (_, i) => `tag=verylongtagnumber${i}`).join('&')
    const loc = makeLocation('/pr-preview/359/products', '?' + manyParams)

    const target = computeRedirectTarget(loc)
    expect(target).not.toBeNull()
    expect((target as string).length).toBeLessThanOrEqual(2000)
  })

  it('falls back to base path only when route-only URL is still over 6000 characters', () => {
    const hugeRoute = '/' + 'very-long-segment-'.repeat(500)
    const loc = makeLocation(hugeRoute)

    const target = computeRedirectTarget(loc)
    expect(target).toBe('https://example.github.io/')
  })

  it('does not drop params when URL is comfortably under the limit', () => {
    const loc = makeLocation('/products', '?type=Software&tag=a11y&minRating=3')
    const target = computeRedirectTarget(loc)
    // Short params should be preserved
    expect(target).toContain(encodeURIComponent('type=Software&tag=a11y&minRating=3'))
  })
})

describe('SPA redirect – self-redirect loop guard', () => {
  it('falls back to canonical base path when computed target equals current href', () => {
    // Construct a location where the first computed target is exactly `href`
    // so the loop-guard branch (`target === loc.href`) is guaranteed to run.
    const href = 'https://example.github.io/?/products'
    const loc = {
      protocol: 'https:',
      hostname: 'example.github.io',
      port: '',
      pathname: '/products',
      search: '',
      hash: '',
      href,
    }

    const target = computeRedirectTarget(loc)

    // Guard should force a canonical base-path redirect, never redirect-to-self.
    expect(target).toBe('https://example.github.io/')
    expect(target).not.toBe(href)
  })
})
