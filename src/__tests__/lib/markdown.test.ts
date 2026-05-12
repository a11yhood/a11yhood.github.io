import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderMarkdown } from '@/lib/markdown'

describe('renderMarkdown', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('resolves relative API image URLs in markdown with the configured backend base', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test')

    const html = renderMarkdown('![Alt text](/api/images/image-123)')

    expect(html).toContain('src="https://api.example.test/api/images/image-123"')
  })

  it('keeps relative API image URLs in markdown when no backend base is configured', () => {
    vi.stubEnv('VITE_API_URL', '')

    const html = renderMarkdown('![Alt text](/api/images/image-123)')

    expect(html).toContain('src="/api/images/image-123"')
  })

  it('leaves absolute markdown image URLs unchanged', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test')

    const html = renderMarkdown('![Alt text](https://cdn.example.test/image-123.png)')

    expect(html).toContain('src="https://cdn.example.test/image-123.png"')
  })
})