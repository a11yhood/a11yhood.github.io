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
})
