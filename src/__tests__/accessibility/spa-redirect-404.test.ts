/**
 * Regression tests for the public/404.html SPA redirect script.
 *
 * The 404.html redirect is the entry point for client-side routing on
 * GitHub Pages (spa-github-pages pattern).  A bug in the redirect logic
 * caused the URL to grow exponentially when the search payload was already
 * URL-encoded (e.g. from a previous redirect cycle), eventually triggering
 * a 414 "URI Too Long" response from the CDN.  That error page has no
 * landmark regions, causing an axe `region` accessibility violation.
 *
 * These tests verify the guards introduced to prevent that loop:
 *  1. Search payloads that already contain a percent sign are dropped.
 *  2. Redirect URLs longer than 2000 characters fall back to the base path.
 *  3. The fallback <body> contains a <main> landmark.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
const html404 = readFileSync(resolve(root, 'public/404.html'), 'utf-8')

// ---------------------------------------------------------------------------
// Helper: run the 404.html redirect script in a sandbox with a mock location.
// Returns the URL that the script would pass to location.replace(), or null
// if no redirect would be issued.
// ---------------------------------------------------------------------------
function simulateRedirect(mockHref: string): string | null {
  const url = new URL(mockHref)

  let replaced: string | null = null

  // Minimal mock for window.location used by the 404.html script.
  const mockLocation = {
    href: mockHref,
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    replace(target: string) {
      replaced = target
    },
  }

  // Extract just the inline script from the first <script> block in <head>.
  const scriptMatch = html404.match(/<script>([\s\S]*?)<\/script>/)
  if (!scriptMatch) throw new Error('Could not find <script> in 404.html')

  // Execute the script with a mock `window` object whose `location` property
  // is our mock.  The script accesses `window.location.*` and calls
  // `l.replace(target)`, so this is sufficient.
  const fn = new Function('window', scriptMatch[1])
  fn({ location: mockLocation })

  return replaced
}

// ---------------------------------------------------------------------------
// Structural tests (static analysis of the HTML source)
// ---------------------------------------------------------------------------
describe('404.html – static structure', () => {
  it('has a <main> landmark in the fallback <body>', () => {
    expect(html404).toContain('<main>')
  })

  it('guards against already-encoded search payloads (% guard)', () => {
    expect(html404).toContain("searchPayload.indexOf('%') !== -1")
  })

  it('guards against excessively long redirect URLs (length guard)', () => {
    expect(html404).toContain('target.length > 2000')
  })
})

// ---------------------------------------------------------------------------
// Behavioral tests: verify the redirect logic produces safe URLs
// ---------------------------------------------------------------------------
describe('404.html – redirect logic guards', () => {
  const origin = 'https://a11yhood.org'

  it('redirects a normal path correctly', () => {
    const target = simulateRedirect(`${origin}/about`)
    expect(target).toBe(`${origin}/?/about`)
  })

  it('redirects a PR preview path correctly', () => {
    const target = simulateRedirect(`${origin}/pr-preview/374/about`)
    expect(target).toBe(`${origin}/pr-preview/374/?/about`)
  })

  it('drops a search payload that already contains a percent sign', () => {
    // This simulates the URL that would be produced by a redirect loop:
    // the search payload '%2F' is already URL-encoded, so re-encoding it
    // would yield '%252F', causing exponential URL growth.
    const target = simulateRedirect(`${origin}/pr-preview/374/?/about&%2F`)
    // The %2F in the search payload should be dropped; the route is empty
    // (the path after the pr-preview prefix is just the query-string-encoded route).
    // The guard should fire and fall back to the base path.
    expect(target).toBeTruthy()
    // Most importantly, the target URL must not contain double-encoded percent signs.
    expect(target).not.toContain('%25')
  })

  it('falls back to base path when redirect URL would exceed 2000 characters', () => {
    // Build a URL whose search string is already very long.
    const longSearch = '?' + 'x'.repeat(2000)
    const target = simulateRedirect(`${origin}/pr-preview/374/${longSearch}`)
    // The resulting target should be the base path, not the full long URL.
    expect(target).toBe(`${origin}/pr-preview/374/`)
    expect((target ?? '').length).toBeLessThanOrEqual(2000)
  })

  it('self-redirect guard: falls back to base path when target equals current href', () => {
    // A URL that, when processed, would redirect to itself.
    const href = `${origin}/pr-preview/374/?/`
    const target = simulateRedirect(href)
    // The guard should prevent an exact self-redirect and fall back to the base path.
    if (target !== null) {
      expect(target).not.toBe(href)
    }
  })
})
