import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { APIService } from '@/lib/api'
import type { Product } from '@/lib/types'

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notify: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}))

vi.mock('@/components/ProductDetail', () => ({
  ProductDetail: ({ product }: { product: { name: string } }) => <h1>{product.name}</h1>,
}))

describe('ProductDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads a product detail route when the URL contains a raw product id', async () => {
    const product: Product = {
      id: 'product-123',
      slug: '',
      name: 'Id Only Product',
      description: 'Test product',
      source: 'github',
      sourceUrl: 'https://example.com/product-123',
      imageUrl: '',
      imageAlt: '',
      tags: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'user-1',
      submittedBy: 'user-1',
      isBanned: false,
    }

    const getProductSpy = vi.spyOn(APIService, 'getProduct').mockResolvedValue(product)

    render(
      <MemoryRouter initialEntries={['/product/product-123']}>
        <Routes>
          <Route
            path="/product/:slug"
            element={
              <ProductDetailPage
                products={[]}
                ratings={[]}
                discussions={[]}
                user={null}
                userAccount={null}
                userCollections={[]}
                onRate={vi.fn()}
                onDiscuss={vi.fn()}
                onAddTag={vi.fn()}
                onAddToCollection={vi.fn().mockResolvedValue(undefined)}
                onRemoveFromCollection={vi.fn().mockResolvedValue(undefined)}
                onCreateCollection={vi.fn()}
                onDelete={vi.fn()}
                onEdit={vi.fn()}
                onToggleBan={vi.fn()}
                onEditDiscussion={vi.fn()}
                onDeleteDiscussion={vi.fn()}
                onToggleBlockDiscussion={vi.fn()}
                onLogin={vi.fn()}
                allTags={[]}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Id Only Product' })).toBeInTheDocument()
    await waitFor(() => {
      expect(getProductSpy).toHaveBeenCalledWith('product-123')
    })
  })
})