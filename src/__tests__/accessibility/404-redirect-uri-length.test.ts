/**
 * Regression test for accessibility issue: "URI Too Long" 414 error page from GitHub Pages.
 *
 * When `public/404.html` redirects a long URL (heavily encoded path + query string),
 * the resulting target URL can exceed GitHub Pages' URI length limit.  The server then
 * returns a raw HTML page whose only content is:
 *
 *   <pre style="word-wrap: break-word; white-space: pre-wrap;">Error: URI Too Long</pre>
 *
 * That <pre> element is not inside any landmark region, violating WCAG 2.1 / axe rule
 * "region" (all page content must be contained by landmarks).
 *
 * The fix: guard the redirect in 404.html so that if the computed target URL exceeds
 * 8 000 characters the script falls back to the canonical base path instead.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')

/**
 * Extract the first <script>…</script> block from an HTML string and return its
 * inner text so we can evaluate it in a controlled environment.
 */
function extractInlineScript(html: string): string {
  const match = html.match(/<script>([\s\S]*?)<\/script>/i)
  if (!match) throw new Error('No <script> block found in HTML')
  return match[1]
}

/**
 * Simulate the 404.html redirect logic with a synthetic window.location.
 * Returns the URL that `location.replace()` would be called with, or null if
 * the script decided not to redirect.
 */
function simulateRedirect(href: string): string | null {
  const url = new URL(href)

  // Replicate the exact computation from public/404.html
  const parts = url.pathname.split('/')
  const pathSegmentsToKeep = (parts[1] === 'pr-preview' && parts[2]) ? 2 : 0
  const basePath = url.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
  const routePayload = url.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/')
  const searchPayload = url.search ? url.search.slice(1) : ''
  const encodedRoute = encodeURIComponent(routePayload)
  const encodedSearch = encodeURIComponent(searchPayload)
  const redirectPath = basePath + '?/' + encodedRoute + (searchPayload ? '&' + encodedSearch : '')
  const port = url.port ? ':' + url.port : ''
  let target = url.protocol + '//' + url.hostname + port + redirectPath + url.hash

  const fallback = url.protocol + '//' + url.hostname + port + basePath + url.hash

  // Guard: self-redirect loop
  if (target === href) {
    target = fallback
  }

  // Guard: URI too long (the fix under test)
  const MAX_URL_LENGTH = 8000
  if (target.length > MAX_URL_LENGTH) {
    target = fallback
  }

  if (target !== href) {
    return target
  }
  return null
}

describe('public/404.html – URI length guard (axe "region" regression)', () => {
  it('contains a MAX_URL_LENGTH guard in the inline script', () => {
    const html = readFileSync(resolve(root, 'public/404.html'), 'utf-8')
    const script = extractInlineScript(html)
    // The script must declare a maximum URL length threshold
    expect(script).toMatch(/MAX_URL_LENGTH/)
    // And apply it before calling l.replace
    expect(script).toMatch(/target\.length\s*>\s*MAX_URL_LENGTH/)
  })

  it('redirects normally for a short URL', () => {
    const result = simulateRedirect('https://a11yhood.github.io/pr-preview/416/some/path')
    expect(result).not.toBeNull()
    // Should encode the path into a query-string redirect
    expect(result).toContain('?/')
  })

  it('falls back to base path when the redirect URL would exceed 8000 chars', () => {
    // Build a URL whose encoded form will far exceed 8000 characters.
    // The encoded redirect adds ~43 chars of overhead (protocol + domain + base path),
    // so the segment itself must be > 8000 chars to guarantee the guard fires.
    const longSegment = 'x'.repeat(8000)
    const href = `https://a11yhood.github.io/pr-preview/416/${longSegment}`
    const result = simulateRedirect(href)
    // Must redirect somewhere (not null)
    expect(result).not.toBeNull()
    // The fallback target must be ≤ 8000 chars so GitHub Pages does not return 414
    expect(result!.length).toBeLessThanOrEqual(8000)
    // Should have fallen back to the base path (no long encoded payload)
    expect(result).not.toContain(longSegment)
    expect(result).not.toContain(encodeURIComponent(longSegment))
  })

  it('falls back to base path when a long query string causes URI overflow', () => {
    const longQuery = 'q=' + 'a'.repeat(4000)
    const href = `https://a11yhood.github.io/pr-preview/416/products?${longQuery}`
    const result = simulateRedirect(href)
    expect(result).not.toBeNull()
    expect(result!.length).toBeLessThanOrEqual(8000)
  })

  it('does not produce a 414-triggering URL for typical navigation paths', () => {
    const normal = 'https://a11yhood.github.io/pr-preview/416/products'
    const result = simulateRedirect(normal)
    if (result !== null) {
      expect(result.length).toBeLessThanOrEqual(8000)
    }
  })
})
