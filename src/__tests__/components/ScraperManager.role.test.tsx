import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScraperManager } from '@/components/ScraperManager'
import { APIService } from '@/lib/api'
import type { Product } from '@/lib/types'

const products: Product[] = [
  {
    id: 'p1',
    name: 'Test Product',
    type: 'tool',
    source: 'User-Submitted',
    description: 'desc',
    tags: [],
    createdAt: Date.now(),
    banned: false,
  },
]

describe('ScraperManager ban/unban controls gated by role', () => {
  it('shows ban button for moderators', () => {
    render(
      <ScraperManager
        products={products}
        onProductsUpdate={() => {}}
        role="moderator"
        currentUserId="u1"
      />
    )

    // Ban button appears (ghost button with title 'Ban product')
    expect(screen.getAllByTitle(/Ban product|Unban product/).length).toBeGreaterThan(0)
  })

  it('hides ban button for regular users', () => {
    render(
      <ScraperManager
        products={products}
        onProductsUpdate={() => {}}
        role="user"
        currentUserId="u1"
      />
    )

    expect(screen.queryByTitle(/Ban product|Unban product/)).toBeNull()
  })
})

describe('ScraperManager source bulk delete', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls backend bulk delete even when current page has no products for that source', async () => {
    const onProductsUpdate = vi.fn()

    vi.spyOn(APIService, 'getProductSources').mockResolvedValue(['AbleData'])
    vi.spyOn(APIService, 'getProductCountBySource').mockImplementation(async (source: string) => {
      return source === 'AbleData' ? 32 : 0
    })
    const bulkDeleteSpy = vi.spyOn(APIService, 'deleteProductsBySource').mockResolvedValue({ deletedCount: 32 })
    vi.spyOn(APIService, 'getAllProducts').mockResolvedValue([] as Product[])
    const deleteProductSpy = vi.spyOn(APIService, 'deleteProduct').mockResolvedValue(undefined)

    // Current page only contains a GitHub item; AbleData exists in backend but is not in this local slice.
    const pagedProducts: Product[] = [
      {
        id: 'p2',
        name: 'GitHub Product',
        type: 'tool',
        source: 'GitHub',
        description: 'desc',
        tags: [],
        createdAt: Date.now(),
        banned: false,
      },
    ]

    render(
      <ScraperManager
        products={pagedProducts}
        onProductsUpdate={onProductsUpdate}
        role="admin"
        currentUserId="u1"
      />,
    )

    await screen.findByText('32 products')

    const deleteAllButtons = screen.getAllByRole('button', { name: 'Delete All' })
    fireEvent.click(deleteAllButtons[0])
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(bulkDeleteSpy).toHaveBeenCalledWith('AbleData')
    })
    expect(deleteProductSpy).not.toHaveBeenCalled()
  })
})
