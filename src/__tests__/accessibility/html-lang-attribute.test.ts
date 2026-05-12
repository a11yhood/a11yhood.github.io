/**
 * Regression tests for static HTML accessibility metadata.
 * Ensures every HTML document served by the app has:
 * - a valid `lang` attribute on <html>
 * - a <title> element in <head>
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

describe('document-title – static HTML documents', () => {
  it('index.html has a non-empty <title>', () => {
    const html = readHtml('index.html')
    expect(html).toMatch(/<title>\s*[^<\s][^<]*<\/title>/i)
  })

  it('public/404.html has a non-empty <title>', () => {
    const html = readHtml('public/404.html')
    expect(html).toMatch(/<title>\s*[^<\s][^<]*<\/title>/i)
  })
})

describe('SPA redirect loop safeguards', () => {
  it('index.html normalizes malformed route/query redirect payloads', () => {
    const html = readHtml('index.html')
    expect(html).toContain("if (route.charAt(0) === '/')")
    expect(html).toContain("if (query.charAt(0) === '/')")
  })

  it('public/404.html drops malformed slash-prefixed search payloads', () => {
    const html = readHtml('public/404.html')
    expect(html).toContain("if (searchPayload.charAt(0) === '/')")
  })
})
