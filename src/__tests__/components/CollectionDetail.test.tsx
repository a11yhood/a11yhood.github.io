import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(screen.getByRole('article', { name: 'Fetched Product' })).toBeInTheDocument()
  })

  it('renders a human-readable product card for prefixed UUID product targets', async () => {
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

    expect(await screen.findByText('Readable Name')).toBeInTheDocument()
    expect(getProductSpy).toHaveBeenCalledWith(`test-product-${productUuid}`)
    expect(getProductSpy).toHaveBeenCalledWith(productUuid)
    expect(screen.getByRole('heading', { name: /products \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Readable Name' })).toBeInTheDocument()
  })

  it('prefers product slug when selecting a product card', async () => {
    const user = userEvent.setup()
    const onSelectProduct = vi.fn()
    const collection: Collection = {
      id: 'collection-select',
      slug: 'collection-select',
      name: 'Collection Select',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [
        {
          kind: 'product',
          targetSlug: 'selectable-product',
        },
      ],
      productSlugs: ['selectable-product'],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const selectableProduct = createMockProduct({
      id: 'product-uuid-1',
      slug: 'selectable-product',
      name: 'Selectable Product',
    })

    vi.spyOn(APIService, 'getCollectionEditors').mockResolvedValue({
      collectionId: collection.id,
      editorIds: [],
    })

    render(
      <MemoryRouter>
        <CollectionDetail
          collection={collection}
          collections={[collection]}
          ratings={[]}
          products={[selectableProduct]}
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={onSelectProduct}
          isOwner={false}
          userAccount={null}
          onDeleteProduct={vi.fn()}
        />
      </MemoryRouter>
    )

    await user.click(screen.getByText('Selectable Product'))

    expect(onSelectProduct).toHaveBeenCalledWith('selectable-product')
  })

  it('shows parent collections and exposes an add button for collection membership', async () => {
    const parentCollection: Collection = {
      id: 'parent-collection',
      slug: 'parent-collection',
      name: 'Parent Collection',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [
        {
          kind: 'collection',
          targetId: 'collection-3',
          title: 'Child Collection',
        },
      ],
      productSlugs: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    const childCollection: Collection = {
      id: 'collection-3',
      slug: 'collection-3',
      name: 'Child Collection',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [],
      productSlugs: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    vi.spyOn(APIService, 'getCollectionEditors').mockResolvedValue({
      collectionId: childCollection.id,
      editorIds: [],
    })

    render(
      <MemoryRouter>
        <CollectionDetail
          collection={childCollection}
          collections={[childCollection, parentCollection]}
          ratings={[]}
          products={[]}
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={vi.fn()}
          isOwner={false}
          userAccount={null}
          onDeleteProduct={vi.fn()}
          onOpenAddToCollection={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /part of/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /collection: parent collection/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add child collection to another collection/i })).toBeInTheDocument()
  })

  it('renders nested collection entries as cards below the collection summary', async () => {
    const childCollection: Collection = {
      id: 'collection-3',
      slug: 'collection-3',
      name: 'Child Collection',
      description: 'Child collection description',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [],
      productSlugs: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    const parentCollection: Collection = {
      id: 'parent-collection',
      slug: 'parent-collection',
      name: 'Parent Collection',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [
        {
          kind: 'collection',
          collectionId: childCollection.id,
          label: childCollection.name,
        } as unknown as Collection['entries'][number],
      ],
      productSlugs: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    vi.spyOn(APIService, 'getCollectionEditors').mockResolvedValue({
      collectionId: parentCollection.id,
      editorIds: [],
    })

    render(
      <MemoryRouter>
        <CollectionDetail
          collection={parentCollection}
          collections={[parentCollection, childCollection]}
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

    expect(screen.getByRole('heading', { name: /nested collections/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /child collection/i })).toBeInTheDocument()
    expect(screen.getByText('Child Collection')).toBeInTheDocument()
    expect(screen.getByText('Child collection description')).toBeInTheDocument()
    expect(screen.queryByText(/collection: child collection/i)).not.toBeInTheDocument()
  })

  it('allows owners to remove nested collection entries using the trash action', async () => {
    const user = userEvent.setup()

    const childCollection: Collection = {
      id: 'collection-child',
      slug: 'collection-child',
      name: 'Child Collection',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [],
      productSlugs: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    const parentCollection: Collection = {
      id: 'collection-parent',
      slug: 'collection-parent',
      name: 'Parent Collection',
      userId: 'owner-1',
      username: 'owner-user',
      entries: [
        {
          kind: 'collection',
          targetId: childCollection.id,
          title: childCollection.name,
        },
      ],
      productSlugs: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    const updatedCollection: Collection = {
      ...parentCollection,
      entries: [],
    }

    vi.spyOn(APIService, 'getCollectionEditors').mockResolvedValue({
      collectionId: parentCollection.id,
      editorIds: [],
    })
    const updateSpy = vi.spyOn(APIService, 'updateCollection').mockResolvedValue(updatedCollection)
    const onCollectionUpdated = vi.fn()

    render(
      <MemoryRouter>
        <CollectionDetail
          collection={parentCollection}
          collections={[parentCollection, childCollection]}
          ratings={[]}
          products={[]}
          onBack={vi.fn()}
          onRemoveProduct={vi.fn()}
          onSelectProduct={vi.fn()}
          isOwner={true}
          userAccount={null}
          onDeleteProduct={vi.fn()}
          onCollectionUpdated={onCollectionUpdated}
        />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /remove from collection/i }))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(parentCollection.slug, {
        entries: [],
      })
    })

    expect(onCollectionUpdated).toHaveBeenCalledWith(updatedCollection)
  })
})
