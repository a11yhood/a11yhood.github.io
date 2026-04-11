import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
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
    createdAt: Date.now(),
    updatedAt: Date.now(),
    publishDate: Date.now(),
    published: true,
    publishedAt: Date.now(),
    ...overrides,
  }
}

describe('HomePage accessibility smoke tests', () => {
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
      createMockBlogPost({ id: 'post-1', title: 'First Post', slug: 'first-post', publishDate: 200 }),
      createMockBlogPost({ id: 'post-2', title: 'Second Post', slug: 'second-post', publishDate: 100 }),
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
