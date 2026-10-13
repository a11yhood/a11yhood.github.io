import { describe, expect, it } from 'vitest'
import { buildShareUrl } from '../../lib/shareLinks'

const url = 'https://a11yhood.org/product/foo?x=1&y=2'
const title = 'Foo & Bar'

describe('buildShareUrl', () => {
  it('encodes the page URL for LinkedIn', () => {
    expect(buildShareUrl('linkedin', url, title)).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    )
  })

  it('puts title and URL in the Bluesky compose text', () => {
    const out = new URL(buildShareUrl('bluesky', url, title))
    expect(out.host).toBe('bsky.app')
    expect(out.searchParams.get('text')).toBe(`${title} ${url}`)
  })

  it('passes title and url to the Mastodon redirector', () => {
    const out = new URL(buildShareUrl('mastodon', url, title))
    expect(out.searchParams.get('text')).toBe(title)
    expect(out.searchParams.get('url')).toBe(url)
  })

  it('builds a mailto link with subject and body', () => {
    const out = buildShareUrl('email', url, title)
    expect(out.startsWith('mailto:?subject=')).toBe(true)
    expect(decodeURIComponent(out)).toContain(`${title}\n${url}`)
  })
})
