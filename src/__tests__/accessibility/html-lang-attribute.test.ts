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

  it('public/404.html includes a level-one heading', () => {
    const html = readHtml('public/404.html')
    expect(html).toMatch(/<h1[^>]*>[\s\S]*<\/h1>/i)
  })

  it('public/404.html escapes missing PR preview root redirect loops', () => {
    const html = readHtml('public/404.html')
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i)
    expect(scriptMatch).not.toBeNull()

    const script = scriptMatch?.[1] ?? ''
    const runRedirect = (pathname: string, search = '') => {
      let redirectedTo = ''
      const location = {
        pathname,
        search,
        hash: '',
        protocol: 'https:',
        hostname: 'a11yhood.org',
        port: '',
        href: `https://a11yhood.org${pathname}${search}`,
        replace: (target: string) => {
          redirectedTo = target
        },
      }

      vm.runInNewContext(script, { window: { location } })
      return redirectedTo
    }

    expect(runRedirect('/pr-preview/416/', ''))
      .toBe('https://a11yhood.org/pr-preview/416/?/')
    expect(runRedirect('/pr-preview/416/', '?/'))
      .toBe('https://a11yhood.org/?/pr-preview%2F416%2F&%2F')
  })
})
