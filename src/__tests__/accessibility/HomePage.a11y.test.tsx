import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '@/components/HomePage'
import { createMockProduct } from '../helpers/create-mocks'
import { runA11yScan } from '../helpers/a11y'
import { FEATURED_TAG } from '@/lib/homepageRandom'
import type { BlogPost } from '@/lib/types'

const defaultProps = {
  blogPosts: [],
  blogPostsLoading: false,
  ratings: [],
  onRate: vi.fn(),
}

function createMockBlogPost(overrides?: Partial<BlogPost>): BlogPost {
  return {
    id: 'post-1',
    title: 'Test Post',
    slug: 'test-post',
    content: 'Test content',
    excerpt: 'Test excerpt',
    authorId: 'author-1',
    authorName: 'Author One',
    createdAt: '2026-04-15T12:00:00.000Z',
    updatedAt: '2026-04-15T12:30:00.000Z',
    publishDate: '2026-04-15T13:00:00.000Z',
    published: true,
    publishedAt: '2026-04-15T13:00:00.000Z',
    ...overrides,
  }
}

describe('HomePage accessibility smoke tests', () => {
  it('has a level-one heading (page-has-heading-one)', () => {
    render(
      <MemoryRouter>
        <HomePage products={[]} {...defaultProps} />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('has no obvious axe violations for initial empty product state', async () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage products={[]} {...defaultProps} />
      </MemoryRouter>
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('has no obvious axe violations with populated content', async () => {
    const products = Array.from({ length: 3 }, (_, i) =>
      createMockProduct({ id: `p${i}`, name: `Product ${i}`, tags: [FEATURED_TAG] })
    )
    const blogPosts = [
      createMockBlogPost({ id: 'post-1', title: 'First Post', slug: 'first-post', publishDate: '2026-04-16T00:00:00.000Z' }),
      createMockBlogPost({ id: 'post-2', title: 'Second Post', slug: 'second-post', publishDate: '2026-04-15T00:00:00.000Z' }),
    ]

    const { container } = render(
      <MemoryRouter>
        <HomePage products={products} {...defaultProps} blogPosts={blogPosts} />
      </MemoryRouter>
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
