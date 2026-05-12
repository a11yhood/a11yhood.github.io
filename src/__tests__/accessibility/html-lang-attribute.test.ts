/**
 * Regression tests for static HTML accessibility metadata.
 * Ensures every HTML document served by the app has:
 * - a valid `lang` attribute on <html>
 * - a <title> element in <head>
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { runInNewContext } from 'node:vm'

// Resolve paths relative to the repository root (three levels above src/__tests__/accessibility/)
const root = resolve(__dirname, '../../../')

function readHtml(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8')
}

const nonEmptyTitlePattern = /<title>\s*[^<\s][^<]*<\/title>/i

function readInlineScript(relativePath: string): string {
  const html = readHtml(relativePath)
  const scriptMatch = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/i)
  if (!scriptMatch?.[1]) {
    throw new Error(`No inline <script> found in ${relativePath}`)
  }
  return scriptMatch[1]
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
    expect(html).toMatch(nonEmptyTitlePattern)
  })

  it('public/404.html has a non-empty <title>', () => {
    const html = readHtml('public/404.html')
    expect(html).toMatch(nonEmptyTitlePattern)
  })
})

describe('SPA redirect loop safeguards', () => {
  it('index.html normalizes malformed slash-prefixed route/query payloads', () => {
    const script = readInlineScript('index.html')
    const replaceState = vi.fn()
    const windowMock = {
      location: {
        search: '?/%2Fprofile&%2Floop',
        pathname: '/pr-preview/42/',
        hash: '',
      },
      history: {
        replaceState,
      },
    }

    runInNewContext(script, { window: windowMock })

    expect(replaceState).toHaveBeenCalledWith(null, null, '/pr-preview/42/profile')
  })

  it('public/404.html drops malformed slash-prefixed search payloads before redirect', () => {
    const script = readInlineScript('public/404.html')
    const replace = vi.fn()
    const locationMock = {
      pathname: '/pr-preview/42/post',
      search: '?/%2F%252Fgrow',
      hash: '',
      protocol: 'https:',
      hostname: 'a11yhood.org',
      port: '',
      href: 'https://a11yhood.org/pr-preview/42/post?/%2F%252Fgrow',
      replace,
    }
    const windowMock = { location: locationMock }

    runInNewContext(script, { window: windowMock })

    expect(replace).toHaveBeenCalledWith('https://a11yhood.org/pr-preview/42/?/post')
  })
})
