import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CollectionDetail } from '@/components/CollectionDetail'
import { APIService } from '@/lib/api'
import { createMockProduct } from '../helpers/create-mocks'
import type { Collection } from '@/lib/types'

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notify: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}))

describe('CollectionDetail', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders fetched product cards when collection entries reference products missing from global products cache', async () => {
    const collection: Collection = {
      id: 'collection-1',
      slug: 'collection-1',
      name: 'Collection 1',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [
        {
          kind: 'product',
          targetSlug: 'fetched-product',
          title: 'Fetched Product',
        },
      ],
      productSlugs: ['fetched-product'],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    const fetchedProduct = createMockProduct({
      id: 'product-1',
      slug: 'fetched-product',
      name: 'Fetched Product',
    })

    vi.spyOn(APIService, 'getCollectionEditors').mockResolvedValue({
      collectionId: collection.id,
      editorIds: [],
    })
    vi.spyOn(APIService, 'getProduct').mockResolvedValue(fetchedProduct)

    render(
      <MemoryRouter>
        <CollectionDetail
          collection={collection}
          collections={[collection]}
          ratings={[]}
          products={[]}
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={vi.fn()}
          isOwner={false}
          userAccount={null}
          onDeleteProduct={vi.fn()}
        />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(APIService.getProduct).toHaveBeenCalledWith('fetched-product')
    })

    expect(await screen.findByText('Fetched Product')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /products \(1\)/i })).toBeInTheDocument()
    expect(screen.getByText('Product: Fetched Product (fetched-product)')).toBeInTheDocument()
  })

  it('shows human-readable included item label for prefixed UUID product targets', async () => {
    const productUuid = '3be25bdd-9d94-4ba2-ae22-1f394bc9038d'
    const collection: Collection = {
      id: 'collection-2',
      slug: 'collection-2',
      name: 'Collection 2',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [
        {
          kind: 'product',
          targetSlug: `test-product-${productUuid}`,
        },
      ],
      productSlugs: [],
      productIds: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    vi.spyOn(APIService, 'getCollectionEditors').mockResolvedValue({
      collectionId: collection.id,
      editorIds: [],
    })
    const getProductSpy = vi.spyOn(APIService, 'getProduct').mockImplementation(async (key: string) => {
      if (key === `test-product-${productUuid}`) {
        throw new Error('not found')
      }

      if (key === productUuid) {
        return createMockProduct({ id: productUuid, slug: 'test-product', name: 'Readable Name' })
      }

      return null
    })

    render(
      <MemoryRouter>
        <CollectionDetail
          collection={collection}
          collections={[collection]}
          ratings={[]}
          products={[]}
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={vi.fn()}
          isOwner={false}
          userAccount={null}
          onDeleteProduct={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(await screen.findByText('Product: Readable Name')).toBeInTheDocument()
    expect(getProductSpy).toHaveBeenCalledWith(`test-product-${productUuid}`)
    expect(getProductSpy).toHaveBeenCalledWith(productUuid)
    expect(screen.getByRole('heading', { name: /products \(1\)/i })).toBeInTheDocument()
  })
})
