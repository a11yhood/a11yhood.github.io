/**
 * Regression test for: https://dequeuniversity.com/rules/axe/4.11/html-has-lang
 * Ensures every HTML document served by the app has a valid `lang` attribute on
 * the <html> element so screen readers can use the correct language/pronunciation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { runInNewContext } from 'vm'

// Resolve paths relative to the repository root (three levels above src/__tests__/accessibility/)
const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

/**
 * Executes the redirect script from public/404.html in a VM sandbox.
 * Returns the URL passed to location.replace, or undefined when no redirect occurs.
 */
function run404RedirectScript(href: string): string | undefined {
  const html = readHtml('public/404.html')
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i)
  if (!scriptMatch?.[1]) {
    throw new Error('Could not locate redirect script in public/404.html')
  }

  const currentUrl = new URL(href)
  let redirectTarget: string | undefined
  const locationLike = {
    href: currentUrl.href,
    protocol: currentUrl.protocol,
    hostname: currentUrl.hostname,
    port: currentUrl.port,
    pathname: currentUrl.pathname,
    search: currentUrl.search,
    hash: currentUrl.hash,
    replace: (next: string) => {
      redirectTarget = next
    },
  }

  runInNewContext(scriptMatch[1], { window: { location: locationLike } })
  return redirectTarget
}

describe('html-has-lang – static HTML documents', () => {
  it('index.html has a lang attribute on <html>', () => {
    const html = readHtml('index.html')
    // The opening <html> tag must contain a non-empty lang attribute (e.g. "en", "en-US")
    expect(html).toMatch(/<html[^>]+lang\s*=\s*["'][a-zA-Z][a-zA-Z-]*["']/)
  })

  it('public/404.html has a lang attribute on <html>', () => {
    const html = readHtml('public/404.html')
    expect(html).toMatch(/<html[^>]+lang\s*=\s*["'][a-zA-Z][a-zA-Z-]*["']/)
  })

  it('public/404.html drops malformed query payloads that can cause URI growth loops', () => {
    const redirectTarget = run404RedirectScript('https://example.com/pr-preview/428/?/%2Fmalformed')
    expect(redirectTarget).toBe('https://example.com/pr-preview/428/?/')
  })

  it('public/404.html preserves valid query payloads without recursive encoding', () => {
    const redirectTarget = run404RedirectScript('https://example.com/pr-preview/428/feature?tag=%2Fdocs')
    // The SPA fallback format is intentionally `?/{route}&{encodedQuery}` so index.html
    // can decode and reconstruct the client-side route and query safely.
    expect(redirectTarget).toBe('https://example.com/pr-preview/428/?/feature&tag%3D%2Fdocs')
  })
})
