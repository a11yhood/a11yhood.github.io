import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlogPostList } from '@/components/BlogPostList'
import type { BlogPost } from '@/lib/types'

describe('BlogPostList summary fallback', () => {
  it('shows a plain-text summary without Markdown link syntax when excerpt is empty', () => {
    const post: BlogPost = {
      id: 'post-589',
      title: 'GOAT update',
      slug: 'goat-update',
      content:
        'Grassroots Open Assistive Tech ([GOAT](https://www.openassistivetech.org/)) has been rocking it recently. In addition to [opening a new makerspace](https://www.openassistivetech.org/visit-goat-space/) and holding numerous in-person events, we moved into A11yhood.',
      authorId: 'author-1',
      authorName: 'Author',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      publishedAt: '2026-01-01T00:00:00Z',
      published: true,
    }

    render(<BlogPostList posts={[post]} />)

    const summary = screen.getByText(/Grassroots Open Assistive Tech/)
    expect(summary.tagName).toBe('P')
    expect(summary).not.toHaveClass('prose')
    expect(summary).not.toHaveClass('whitespace-pre-wrap')
    expect(summary.textContent).toBe(
      'Grassroots Open Assistive Tech (GOAT) has been rocking it recently. In addition to opening a new makerspace and holding numerous in-person events, we moved into A11yhood.'
    )
  })

  it('renders Markdown excerpts as plain text too', () => {
    const post: BlogPost = {
      id: 'post-590',
      title: 'Markdown excerpt',
      slug: 'markdown-excerpt',
      content: 'Full post body.',
      excerpt: 'Read **bold** [docs](https://example.com) &amp; more.',
      authorId: 'author-1',
      authorName: 'Author',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      publishedAt: '2026-01-01T00:00:00Z',
      published: true,
    }

    render(<BlogPostList posts={[post]} />)

    const summary = screen.getByText('Read bold docs & more.')
    expect(summary.tagName).toBe('P')
    expect(summary.textContent).not.toContain('https://')
  })
})
