/**
 * Regression test for: https://dequeuniversity.com/rules/axe/4.11/html-has-lang
 * Ensures every HTML document served by the app has a valid `lang` attribute on
 * the <html> element so screen readers can use the correct language/pronunciation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Script } from 'vm'

// Resolve paths relative to the repository root (three levels above src/__tests__/accessibility/)
const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

const ALLOWED_INLINE_SCRIPT_FILES = new Set(['index.html', 'public/404.html'])

function readInlineScript(relativePath: string): string {
  if (!ALLOWED_INLINE_SCRIPT_FILES.has(relativePath)) {
    throw new Error(`Inline script fixture is not trusted: ${relativePath}`)
  }

  const html = readHtml(relativePath)
  const document = new DOMParser().parseFromString(html, 'text/html')
  const scripts = Array.from(document.querySelectorAll('script')).filter((script) => script.textContent?.trim())

  if (scripts.length !== 1) {
    throw new Error(`Expected exactly one inline script in ${relativePath}, found ${scripts.length}`)
  }

  return scripts[0].textContent || ''
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

  new Script(script).runInNewContext({ window }, { timeout: 1000 })

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

  it('prevents PR preview redirect loops for malformed double-slash paths', () => {
    const notFoundRedirect = readInlineScript('public/404.html')
    const previewIndexRedirect = readInlineScript('index.html')

    const redirectedUrl = runInlineScript(
      notFoundRedirect,
      'https://a11yhood.org/pr-preview/416//products'
    )
    expect(redirectedUrl).toBe('https://a11yhood.org/pr-preview/416/?/products')

    const resolvedUrl = runInlineScript(previewIndexRedirect, redirectedUrl)
    expect(resolvedUrl).toBe('https://a11yhood.org/pr-preview/416/products')
  })

  it('normalizes malformed PR preview query payloads with leading slashes', () => {
    const previewIndexRedirect = readInlineScript('index.html')

    const resolvedUrl = runInlineScript(
      previewIndexRedirect,
      'https://a11yhood.org/pr-preview/416/?/%2Fproducts'
    )
    expect(resolvedUrl).toBe('https://a11yhood.org/pr-preview/416/products')
  })
})
