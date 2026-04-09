import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '@/components/HomePage'
import { createMockProduct } from '../helpers/create-mocks'
import { FEATURED_TAG } from '@/lib/homepageRandom'

const defaultProps = {
  blogPosts: [],
  blogPostsLoading: false,
  ratings: [],
  onRate: vi.fn(),
}

describe('HomePage - Explore Products sidebar', () => {
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
    const cards = screen.queryAllByRole('article')
    expect(cards.length).toBeGreaterThan(0)
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
})
