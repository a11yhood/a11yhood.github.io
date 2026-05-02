/**
 * Regression test for: https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one
 *
 * Ensures every static HTML document served by the app contains a level-one
 * heading so that screen-reader users can orient themselves on the page.
 *
 * Context: public/404.html is served as a fallback for GitHub Pages SPA routing.
 * When a PR preview no longer exists the redirect loop in 404.html would
 * previously grow the URL on every request until the server returned HTTP 414
 * (URI Too Long) – a raw error page with no <h1>.  The fix adds loop-detection
 * to 404.html so it renders its own body (with a proper <h1>) instead of
 * redirecting endlessly.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

describe('page-has-heading-one – static HTML documents', () => {
  it('public/404.html contains a level-one heading', () => {
    const html = readHtml('public/404.html')
    // The body must include at least one <h1> (with optional attributes)
    expect(html).toMatch(/<h1[\s>]/)
  })
})
