import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownText } from '@/components/ui/MarkdownText'

describe('MarkdownText', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('resolves relative API image URLs with configured backend base', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test')

    render(<MarkdownText text="![Alt text](/api/images/image-123)" />)

    expect(screen.getByRole('img', { name: 'Alt text' })).toHaveAttribute(
      'src',
      'https://api.example.test/api/images/image-123'
    )
  })

  it('keeps absolute image URLs unchanged', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test')

    render(<MarkdownText text="![Alt text](https://cdn.example.test/image-123.png)" />)

    expect(screen.getByRole('img', { name: 'Alt text' })).toHaveAttribute(
      'src',
      'https://cdn.example.test/image-123.png'
    )
  })
})