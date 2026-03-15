/**
 * Regression test for: "When direct loading a collection it looks empty"
 *
 * When a collection detail page is directly loaded (e.g. via a bookmarked URL),
 * the global `products` prop passed to `CollectionDetail` is an empty array because
 * the App does not pre-fetch all products on that route.  The component must therefore
 * fall back to fetching each product individually via `APIService.getProduct`.
 *
 * This test verifies that `CollectionDetail` correctly fetches and displays products
 * from `collection.productSlugs` when `globalProducts` is empty.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CollectionDetail } from '@/components/CollectionDetail'
import { APIService } from '@/lib/api'
import type { Collection, Product } from '@/lib/types'

const PRODUCT_SLUGS = ['product-laser-1', 'product-laser-2']

const mockCollection: Collection = {
  id: 'col-abc',
  slug: 'laser-cuttable-at-ideas',
  name: 'Laser Cuttable at Ideas',
  userId: 'user-1',
  username: 'testuser',
  productSlugs: PRODUCT_SLUGS,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  isPublic: true,
}

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Laser Cutter Frame',
    description: 'A laser-cuttable frame',
    source: 'GitHub',
    type: 'Tool',
    tags: ['laser'],
    slug: 'product-laser-1',
    createdAt: Date.now(),
    sourceUrl: 'https://github.com/test/product-1',
  },
  {
    id: 'p2',
    name: 'Acrylic Bracket',
    description: 'A laser-cuttable bracket',
    source: 'GitHub',
    type: 'Tool',
    tags: ['laser', 'acrylic'],
    slug: 'product-laser-2',
    createdAt: Date.now(),
    sourceUrl: 'https://github.com/test/product-2',
  },
]

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(APIService, 'getProduct').mockImplementation(async (slug) => {
    return mockProducts.find((p) => p.slug === slug) ?? null
  })
})

describe('CollectionDetail – direct load (empty globalProducts)', () => {
  it('fetches and displays all products from productSlugs when globalProducts is empty', async () => {
    render(
      <MemoryRouter>
        <CollectionDetail
          collection={mockCollection}
          ratings={[]}
          products={[]}           // simulates direct load: no globally pre-fetched products
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={vi.fn()}
          isOwner={false}
          onDeleteProduct={vi.fn()}
        />
      </MemoryRouter>
    )

    // Both products should be fetched from the API and rendered
    expect(await screen.findByText('Laser Cutter Frame')).toBeInTheDocument()
    expect(await screen.findByText('Acrylic Bracket')).toBeInTheDocument()

    // getProduct should have been called once per slug
    expect(APIService.getProduct).toHaveBeenCalledWith('product-laser-1')
    expect(APIService.getProduct).toHaveBeenCalledWith('product-laser-2')
  })

  it('shows empty-collection message when productSlugs is empty', async () => {
    const emptyCollection: Collection = { ...mockCollection, productSlugs: [] }

    render(
      <MemoryRouter>
        <CollectionDetail
          collection={emptyCollection}
          ratings={[]}
          products={[]}
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={vi.fn()}
          isOwner={false}
          onDeleteProduct={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(await screen.findByText(/this collection is empty/i)).toBeInTheDocument()
    expect(APIService.getProduct).not.toHaveBeenCalled()
  })

  it('uses globally pre-fetched products and skips API calls for cached slugs', async () => {
    render(
      <MemoryRouter>
        <CollectionDetail
          collection={mockCollection}
          ratings={[]}
          products={mockProducts}   // simulates in-app navigation: products already loaded
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={vi.fn()}
          isOwner={false}
          onDeleteProduct={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(await screen.findByText('Laser Cutter Frame')).toBeInTheDocument()
    expect(await screen.findByText('Acrylic Bracket')).toBeInTheDocument()

    // No API calls needed when products are already available
    expect(APIService.getProduct).not.toHaveBeenCalled()
  })
})
