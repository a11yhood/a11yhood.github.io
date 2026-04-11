import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '@/components/HomePage'
import { createMockProduct } from '../helpers/create-mocks'
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

describe('HomePage', () => {
  it('renders nothing in the sidebar when products is empty (loading state)', () => {
    render(
      <MemoryRouter>
        <HomePage products={[]} {...defaultProps} />
      </MemoryRouter>
    )
    // No product article cards should be rendered while loading
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('shows product cards once products are available', () => {
    const products = Array.from({ length: 3 }, (_, i) =>
      createMockProduct({ id: `p${i}`, name: `Product ${i}`, tags: [FEATURED_TAG] })
    )
    render(
      <MemoryRouter>
        <HomePage products={products} {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.queryAllByRole('article')).toHaveLength(products.length)
  })

  it('never renders a "No more products available" placeholder — even when selectFeaturedRandomProducts pads with nulls', () => {
    // With only 1 product and RANDOM_PRODUCT_COUNT=5, selectFeaturedRandomProducts
    // returns 4 null-padded slots; those must be silently dropped, not rendered.
    const products = [createMockProduct({ id: 'p1', tags: [FEATURED_TAG] })]
    render(
      <MemoryRouter>
        <HomePage products={products} {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.queryByText(/no more products/i)).not.toBeInTheDocument()
  })

  it('renders no loading skeleton or placeholder text while products is empty', () => {
    render(
      <MemoryRouter>
        <HomePage products={[]} {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.queryByText(/loading products/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no more products/i)).not.toBeInTheDocument()
  })

  it('hides secondary news posts on mobile while keeping the first post visible', () => {
    const blogPosts = [
      createMockBlogPost({ id: 'post-1', title: 'First Post', slug: 'first-post', publishDate: 200 }),
      createMockBlogPost({ id: 'post-2', title: 'Second Post', slug: 'second-post', publishDate: 100 }),
    ]

    render(
      <MemoryRouter>
        <HomePage products={[]} {...defaultProps} blogPosts={blogPosts} />
      </MemoryRouter>
    )

    const firstPostLink = screen.getByRole('link', { name: /first post/i })
    const secondPostLink = screen.getByRole('link', { name: /second post/i })

    expect(firstPostLink).not.toHaveClass('hidden')
    expect(firstPostLink).not.toHaveClass('lg:block')
    expect(secondPostLink).toHaveClass('hidden')
    expect(secondPostLink).toHaveClass('lg:block')
  })

  it('renders sections once in reading order and uses desktop grid placement classes', () => {
    const products = [createMockProduct({ id: 'p1', name: 'Product 1', tags: [FEATURED_TAG] })]
    const blogPosts = [createMockBlogPost({ title: 'Only Post', slug: 'only-post' })]

    render(
      <MemoryRouter>
        <HomePage products={products} {...defaultProps} blogPosts={blogPosts} />
      </MemoryRouter>
    )

    expect(screen.getAllByRole('heading', { name: 'News' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: 'Explore Products' })).toHaveLength(1)

    const grid = screen.getByTestId('homepage-grid')
    expect(Array.from(grid.children).map((element) => element.getAttribute('data-testid'))).toEqual([
      'homepage-welcome-section',
      'homepage-search-section',
      'homepage-news-section',
      'homepage-explore-section',
    ])

    expect(screen.getByTestId('homepage-welcome-section')).toHaveClass(
      'lg:col-start-4',
      'lg:col-span-7',
      'lg:row-start-1'
    )
    expect(screen.getByTestId('homepage-search-section')).toHaveClass(
      'lg:col-span-3',
      'lg:row-start-1'
    )
    expect(screen.getByTestId('homepage-news-section')).toHaveClass(
      'lg:col-start-4',
      'lg:col-span-7',
      'lg:row-start-2'
    )
    expect(screen.getByTestId('homepage-explore-section')).toHaveClass(
      'lg:col-span-3',
      'lg:row-start-2'
    )
  })
})
