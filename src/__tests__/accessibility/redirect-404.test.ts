/**
 * Regression tests for the HTTP 414 URI Too Long guard in public/404.html.
 *
 * The SPA redirect script in 404.html encodes the current path as a query
 * parameter and redirects to index.html.  When the original URL already
 * contains a very long path or query string the encoded redirect URL can
 * exceed server character limits, causing the server to respond with a 414
 * "URI Too Long" error page.  That server page has no <h1> heading, which
 * violates the axe rule: page-has-heading-one.
 *
 * The guard added to 404.html caps the redirect URL at 2000 characters and
 * falls back to the canonical base path, allowing the SPA to render the
 * home page (which always has an <h1> heading).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

/**
 * Mirrors the redirect logic in public/404.html so that tests stay in sync
 * with the actual implementation.  When the 404.html script changes, this
 * function must be updated to match.
 */
function simulateRedirect(href: string): string {
  const l = new URL(href)
  const parts = l.pathname.split('/')
  const pathSegmentsToKeep = (parts[1] === 'pr-preview' && parts[2]) ? 2 : 0
  const basePath = l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
  const routePayload = l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/')
  const searchPayload = l.search ? l.search.slice(1) : ''
  const encodedRoute = encodeURIComponent(routePayload)
  const encodedSearch = encodeURIComponent(searchPayload)
  const redirectPath = basePath + '?/' + encodedRoute + (searchPayload ? '&' + encodedSearch : '')
  const origin = l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '')
  const fallback = origin + basePath + l.hash
  let target = origin + redirectPath + l.hash

  // Self-redirect guard
  if (target === href) {
    target = fallback
  }

  // URI Too Long guard (mirrors the 2000-char limit in 404.html)
  if (target.length > 2000) {
    target = fallback
  }

  return target
}

describe('404.html redirect script – URI length guard', () => {
  it('contains a URI length guard to prevent HTTP 414 errors', () => {
    const html = readHtml('public/404.html')
    // The script must include a numeric length check on the target URL.
    expect(html).toMatch(/target\.length\s*>\s*\d+/)
  })

  it('redirects a normal path to the SPA query-string format', () => {
    const result = simulateRedirect('https://a11yhood.org/some/path')
    expect(result).toBe('https://a11yhood.org/?/some%2Fpath')
    expect(result.length).toBeLessThanOrEqual(2000)
  })

  it('redirects a PR preview path to its own base index', () => {
    const result = simulateRedirect('https://a11yhood.org/pr-preview/374/some/route')
    expect(result).toBe('https://a11yhood.org/pr-preview/374/?/some%2Froute')
    expect(result.length).toBeLessThanOrEqual(2000)
  })

  it('falls back to the PR preview base path when redirect URL exceeds 2000 chars', () => {
    // Route payload of 2000 a's pushes the encoded redirect URL well past the limit.
    const longUrl = 'https://a11yhood.org/pr-preview/374/' + 'a'.repeat(2000)
    const result = simulateRedirect(longUrl)
    expect(result).toBe('https://a11yhood.org/pr-preview/374/')
    expect(result.length).toBeLessThanOrEqual(2000)
  })

  it('falls back to the root base path when redirect URL exceeds 2000 chars for non-preview paths', () => {
    const longUrl = 'https://a11yhood.org/' + 'b'.repeat(2000)
    const result = simulateRedirect(longUrl)
    expect(result).toBe('https://a11yhood.org/')
    expect(result.length).toBeLessThanOrEqual(2000)
  })
})
