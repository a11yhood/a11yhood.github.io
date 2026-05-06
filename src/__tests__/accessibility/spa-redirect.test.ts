/**
 * Tests for the SPA routing redirect scripts in public/404.html and index.html.
 *
 * Background: GitHub Pages cannot serve arbitrary SPA routes as static files, so
 * unrecognised paths are handled by 404.html which encodes the real path into the
 * query string and redirects to index.html, where a companion script decodes it
 * and calls history.replaceState to restore the original URL.
 *
 * Accessibility issue: before this fix, 404.html used encodeURIComponent() on the
 * already-URL-encoded search string, inflating every `&` → `%26` and `=` → `%3D`.
 * On long pages (many tag filters, long search queries) the doubled encoding could
 * push the redirect URL past GitHub Pages / nginx's ~8 KB URI limit, returning a
 * bare "URI Too Long" page that has no <main> landmark (axe rule landmark-one-main).
 *
 * These tests cover:
 *  – that the redirect URL never exceeds 4096 characters for realistic filter sets
 *  – that the round-trip (404 → index decode) preserves the original path + query
 *  – that the index.html guard drops a malformed query starting with '/' or '%2F'
 */

import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Inline the 404.html redirect logic so it can be unit-tested.
// Keep this in sync with public/404.html.
// ---------------------------------------------------------------------------
function compute404Redirect(
  origin: string,
  pathname: string,
  search: string,
  hash: string,
): string {
  const parts = pathname.split('/')
  const pathSegmentsToKeep =
    parts[1] === 'pr-preview' && parts[2] ? 2 : 0

  const basePath =
    pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
  const routePayload = pathname
    .slice(1)
    .split('/')
    .slice(pathSegmentsToKeep)
    .join('/')
  // searchPayload is already correctly URL-encoded by the browser
  const searchPayload = search ? search.slice(1) : ''
  const encodedRoute = encodeURIComponent(routePayload)
  const redirectPath =
    basePath +
    '?/' +
    encodedRoute +
    (searchPayload ? '&' + searchPayload : '')
  let target = origin + redirectPath + hash

  const currentHref = origin + pathname + search + hash

  // Self-redirect guard
  if (target === currentHref) {
    target = origin + basePath + hash
  }

  // Length guard – mirrors the 4096-char cap in public/404.html
  if (target.length > 4096) {
    target = origin + basePath + hash
  }

  return target
}

// ---------------------------------------------------------------------------
// Inline the index.html decode logic so it can be unit-tested.
// Keep this in sync with index.html.
// ---------------------------------------------------------------------------
function decodePayload(value: string): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function applyIndexRedirect(
  search: string,
  pathname: string,
): { route: string; query: string } | null {
  if (search[1] !== '/') return null

  const q = search.slice(1).split('&')
  const route = decodePayload(q[0].slice(1))
  // Query is NOT decoded – passed through as-is (no double-encoding from 404.html)
  let query = q.slice(1).join('&')
  // Malformed data guard
  if (query.charAt(0) === '/' || query.slice(0, 3).toLowerCase() === '%2f') {
    query = ''
  }

  void pathname // used by caller to set basePath
  return { route, query }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ORIGIN = 'https://a11yhood.org'
const PR_PREVIEW_BASE = '/pr-preview/388'

function makeLongSearch(tagCount: number): string {
  const tags = Array.from({ length: tagCount }, (_, i) => `tag=assistive-tech-item-${i}`)
  return tags.join('&')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('public/404.html – redirect URL length', () => {
  it('keeps redirect URL under 4096 chars for 20 tag filters', () => {
    const search = '?' + makeLongSearch(20)
    const target = compute404Redirect(
      ORIGIN,
      `${PR_PREVIEW_BASE}/products`,
      search,
      '',
    )
    expect(target.length).toBeLessThanOrEqual(4096)
  })

  it('falls back to base path when search params exceed the length cap', () => {
    // 300 tags × ~35 chars each = ~10 500 chars → exceeds 4096
    const search = '?' + makeLongSearch(300)
    const target = compute404Redirect(
      ORIGIN,
      `${PR_PREVIEW_BASE}/products`,
      search,
      '',
    )
    // Must fall back to the PR-preview base path (no search params)
    expect(target).toBe(`${ORIGIN}${PR_PREVIEW_BASE}/`)
    expect(target.length).toBeLessThanOrEqual(4096)
  })

  it('does NOT double-encode ampersands in the search string', () => {
    const search = '?q=ramp&tag=3d-printing&sort=rating-desc'
    const target = compute404Redirect(ORIGIN, '/products', search, '')
    // If double-encoding were applied, & would become %26 inside the query
    expect(target).not.toContain('%26')
    expect(target).toContain('&')
  })

  it('does NOT double-encode equals signs in the search string', () => {
    const search = '?q=ramp&minRating=3'
    const target = compute404Redirect(ORIGIN, '/products', search, '')
    // Original '=' in param values would wrongly become '%3D with double-encoding
    // (We care about the ones in values, not the key=value separator which is kept as-is)
    expect(target).not.toMatch(/q%3D/)
  })

  it('still encodes slashes in the route path segment', () => {
    const target = compute404Redirect(
      ORIGIN,
      `${PR_PREVIEW_BASE}/product/my-slug`,
      '',
      '',
    )
    // route 'product/my-slug' must be encoded so the redirect stays a ?/ redirect
    expect(target).toContain('product%2Fmy-slug')
  })

  it('correctly handles a search query with percent-encoded characters', () => {
    // %20 = space, already encoded by the browser
    const search = '?q=wheelchair%20ramp&tag=3d-printing'
    const target = compute404Redirect(ORIGIN, '/products', search, '')
    // %20 should appear as-is (not double-encoded to %2520)
    expect(target).toContain('%20')
    expect(target).not.toContain('%2520')
  })
})

describe('public/404.html – round-trip with index.html decode', () => {
  function roundTrip(
    pathnameFragment: string,
    search: string,
    basePath = '',
  ): string {
    const target = compute404Redirect(
      ORIGIN,
      basePath + pathnameFragment,
      search,
      '',
    )
    const url = new URL(target)
    const decoded = applyIndexRedirect(url.search, url.pathname)
    if (!decoded) return target
    const { route, query } = decoded
    const base = url.pathname.replace(/\/$/, '')
    return base + (route ? '/' + route : '/') + (query ? '?' + query : '')
  }

  it('restores /products route without search params', () => {
    expect(roundTrip('/products', '')).toBe('/products')
  })

  it('restores /products route with a simple search query', () => {
    expect(roundTrip('/products', '?q=ramp')).toBe('/products?q=ramp')
  })

  it('restores /products route with multiple filter params', () => {
    const search = '?q=ramp&tag=3d-printing&sort=rating-desc'
    expect(roundTrip('/products', search)).toBe('/products' + search)
  })

  it('restores PR-preview route with query params', () => {
    const result = roundTrip(
      '/products',
      '?q=ramp&tag=foo',
      PR_PREVIEW_BASE,
    )
    expect(result).toBe(`${PR_PREVIEW_BASE}/products?q=ramp&tag=foo`)
  })

  it('preserves percent-encoded spaces in query values', () => {
    const search = '?q=wheelchair%20ramp'
    const result = roundTrip('/products', search)
    expect(result).toBe('/products?q=wheelchair%20ramp')
  })

  it('restores /product/slug nested route', () => {
    const result = roundTrip('/product/my-product-slug', '')
    expect(result).toBe('/product/my-product-slug')
  })
})

describe('index.html redirect decode – malformed data guard', () => {
  it('drops a query that starts with "/"', () => {
    // This would happen if 404.html was somehow fed a redirect URL
    const result = applyIndexRedirect('?/products&/malformed-data', '/')
    expect(result?.query).toBe('')
  })

  it('drops a query that starts with "%2F"', () => {
    const result = applyIndexRedirect('?/products&%2Fmalformed', '/')
    expect(result?.query).toBe('')
  })

  it('does not drop a normal query', () => {
    const result = applyIndexRedirect('?/products&q=ramp', '/')
    expect(result?.query).toBe('q=ramp')
  })
})
