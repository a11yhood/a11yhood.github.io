/**
 * Regression test for: https://dequeuniversity.com/rules/axe/4.11/html-has-lang
 * Ensures every HTML document served by the app has a valid `lang` attribute on
 * the <html> element so screen readers can use the correct language/pronunciation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Script, createContext } from 'vm'

// Resolve paths relative to the repository root (three levels above src/__tests__/accessibility/)
const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

const TRUSTED_INLINE_SCRIPT_FIXTURES = new Set(['index.html', 'public/404.html'])

function readInlineScript(relativePath: string): string {
  if (!TRUSTED_INLINE_SCRIPT_FIXTURES.has(relativePath)) {
    throw new Error(`Inline script fixture is not trusted: ${relativePath}`)
  }

  const html = readHtml(relativePath)
  const match = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)

  if (!match) {
    throw new Error(`No inline script found in ${relativePath}`)
  }

  return match[1]
}

function runInlineScript(script: string, initialUrl: string): string {
  let currentUrl = new URL(initialUrl)

  const updateUrl = (nextUrl: string) => {
    currentUrl = new URL(nextUrl, currentUrl.origin)
  }

  const location = {
    get href() {
      return currentUrl.toString()
    },
    get protocol() {
      return currentUrl.protocol
    },
    get hostname() {
      return currentUrl.hostname
    },
    get port() {
      return currentUrl.port
    },
    get pathname() {
      return currentUrl.pathname
    },
    get search() {
      return currentUrl.search
    },
    get hash() {
      return currentUrl.hash
    },
    replace(nextUrl: string) {
      updateUrl(nextUrl)
    },
  }

  const window = {
    location,
    history: {
      replaceState: (_state: unknown, _title: string, nextUrl: string) => {
        updateUrl(nextUrl)
      },
    },
  }

  const context = createContext({ window })
  new Script(script).runInContext(context)

  return currentUrl.toString()
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

  it('normalizes malformed PR preview redirect paths with leading slashes', () => {
    const notFoundRedirect = readInlineScript('public/404.html')
    const previewIndexRedirect = readInlineScript('index.html')

    const redirectedUrl = runInlineScript(
      notFoundRedirect,
      'https://a11yhood.org/pr-preview/416//products'
    )
    expect(redirectedUrl).toBe('https://a11yhood.org/pr-preview/416/?/products')

    const finalUrl = runInlineScript(previewIndexRedirect, redirectedUrl)
    expect(finalUrl).toBe('https://a11yhood.org/pr-preview/416/products')
  })
})
