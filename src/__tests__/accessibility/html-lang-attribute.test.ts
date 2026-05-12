/**
 * Regression test for: https://dequeuniversity.com/rules/axe/4.11/html-has-lang
 * Ensures every HTML document served by the app has a valid `lang` attribute on
 * the <html> element so screen readers can use the correct language/pronunciation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import vm from 'node:vm'

// Resolve paths relative to the repository root (three levels above src/__tests__/accessibility/)
const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

function readInlineScript(html: string): string {
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/i)
  if (!match) throw new Error('Inline script not found')
  return match[1]
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

  it('public/404.html has one main landmark', () => {
    const html = readHtml('public/404.html')
    const mainMatches = html.match(/<main\b/gi) || []
    expect(mainMatches).toHaveLength(1)
  })

  it('public/404.html drops malformed redirect query payloads', () => {
    const html = readHtml('public/404.html')
    const script = readInlineScript(html)

    let replaced = ''
    const location = {
      pathname: '/pr-preview/428/non-existent-page',
      search: '?/%2Flooping-payload',
      protocol: 'https:',
      hostname: 'a11yhood.org',
      port: '',
      hash: '',
      href: 'https://a11yhood.org/pr-preview/428/non-existent-page?/%2Flooping-payload',
      replace(url: string) {
        replaced = url
      },
    }

    vm.runInNewContext(script, { window: { location } })

    expect(replaced).toBe('https://a11yhood.org/pr-preview/428/?/non-existent-page')
  })
})
