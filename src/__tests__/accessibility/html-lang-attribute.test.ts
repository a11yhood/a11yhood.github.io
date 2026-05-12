/**
 * Regression test for: https://dequeuniversity.com/rules/axe/4.11/html-has-lang
 * Ensures every HTML document served by the app has a valid `lang` attribute on
 * the <html> element so screen readers can use the correct language/pronunciation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Resolve paths relative to the repository root (three levels above src/__tests__/accessibility/)
const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

const nonEmptyHtmlTitlePattern = /<title>\s*[^<\s][^<]*<\/title>/i
const oversizedRedirectGuardPattern =
  /if\s*\(\s*target\.length\s*>\s*maxRedirectTargetLength\s*\)\s*\{[\s\S]*?target\s*=\s*l\.href;[\s\S]*?\}/

describe('static HTML documents – lang attribute and title metadata', () => {
  it('index.html has a lang attribute on <html>', () => {
    const html = readHtml('index.html')
    // The opening <html> tag must contain a non-empty lang attribute (e.g. "en", "en-US")
    expect(html).toMatch(/<html[^>]+lang\s*=\s*["'][a-zA-Z][a-zA-Z-]*["']/)
  })

  it('public/404.html has a lang attribute on <html>', () => {
    const html = readHtml('public/404.html')
    expect(html).toMatch(/<html[^>]+lang\s*=\s*["'][a-zA-Z][a-zA-Z-]*["']/)
  })

  it('index.html has a non-empty <title>', () => {
    const html = readHtml('index.html')
    expect(html).toMatch(nonEmptyHtmlTitlePattern)
  })

  it('public/404.html has a non-empty <title>', () => {
    const html = readHtml('public/404.html')
    expect(html).toMatch(nonEmptyHtmlTitlePattern)
  })

  it('public/404.html preserves an accessible fallback for oversized URLs', () => {
    const html = readHtml('public/404.html')
    expect(html).toMatch(/maxRedirectTargetLength\s*=\s*7500/)
    expect(html).toMatch(oversizedRedirectGuardPattern)
    expect(html).toContain('<h1>Page not found</h1>')
  })
})
