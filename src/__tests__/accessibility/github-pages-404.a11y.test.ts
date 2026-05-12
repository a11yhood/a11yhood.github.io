import { readFileSync } from 'fs'
import { resolve } from 'path'
import { runInNewContext } from 'vm'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../../')
const html = readFileSync(resolve(root, 'public/404.html'), 'utf-8')

function extract404Script(): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const script = document.querySelector('script')?.textContent

  if (!script) {
    throw new Error('Expected public/404.html to contain an inline redirect script')
  }

  return script
}

function runRedirect(pathname: string, search = '') {
  let redirectHref = ''
  let replacedWith = ''

  const location = {
    pathname,
    search,
    hash: '',
    href: `https://a11yhood.org${pathname}${search}`,
    protocol: 'https:',
    hostname: 'a11yhood.org',
    port: '',
    replace(value: string) {
      replacedWith = value
    },
  }

  runInNewContext(extract404Script(), {
    window: { location },
    document: {
      getElementById(id: string) {
        if (id !== 'redirect-link') return null

        return {
          setAttribute(name: string, value: string) {
            if (name === 'href') {
              redirectHref = value
            }
          },
        }
      },
    },
  })

  return { redirectHref, replacedWith }
}

describe('GitHub Pages 404 shell accessibility', () => {
  it('contains exactly one main landmark', () => {
    const document = new DOMParser().parseFromString(html, 'text/html')

    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.querySelector('main h1')?.textContent).toMatch(/redirecting to a11yhood/i)
  })
})

describe('GitHub Pages 404 redirect guard', () => {
  it('keeps the manual fallback link inside the current PR preview', () => {
    const { redirectHref } = runRedirect('/pr-preview/416/missing/page')

    expect(redirectHref).toBe('/pr-preview/416/')
  })

  it('preserves normal PR preview redirects', () => {
    const { replacedWith } = runRedirect('/pr-preview/416/missing/page', '?ref=docs')

    expect(replacedWith).toBe('https://a11yhood.org/pr-preview/416/?/missing%2Fpage&ref%3Ddocs')
  })

  it('falls back to the preview root for oversized redirect payloads', () => {
    // 2,500 characters comfortably exceeds the 1,800-character redirect cap in
    // public/404.html, so this reproduces the URI-length fallback path.
    const { replacedWith } = runRedirect('/pr-preview/416/missing/page', `?${'q'.repeat(2500)}`)

    expect(replacedWith).toBe('https://a11yhood.org/pr-preview/416/')
  })
})
