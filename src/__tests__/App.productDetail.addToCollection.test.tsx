import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { APIService } from '@/lib/api'
import { createMockProduct, createMockUserAccount } from './helpers/create-mocks'
import type { Collection } from '@/lib/types'

describe('App product detail add-to-collection flow', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds a product only to the checked collection', async () => {
    const user = userEvent.setup()
    const product = createMockProduct({
      id: 'product-1',
      slug: 'product-slug',
      name: 'Product Under Test',
    })
    const userAccount = createMockUserAccount({
      id: 'user-1',
      username: 'test-user',
      role: 'user',
    })

    const firstCollection: Collection = {
      id: 'collection-1',
      slug: 'collection-1',
      name: 'First Collection',
      userId: userAccount.id,
      username: userAccount.username,
      productSlugs: [],
      entries: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    const secondCollection: Collection = {
      id: 'collection-2',
      slug: 'collection-2',
      name: 'Second Collection',
      userId: userAccount.id,
      username: userAccount.username,
      productSlugs: [],
      entries: [],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    vi.spyOn(APIService, 'getCurrentUser').mockResolvedValue(userAccount)
    vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([firstCollection, secondCollection])
    vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getProduct').mockResolvedValue(product)
    vi.spyOn(APIService, 'getAllRatings').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllDiscussions').mockResolvedValue([])
    vi.spyOn(APIService, 'getProductOwners').mockResolvedValue([])
    vi.spyOn(APIService, 'getMyRequests').mockResolvedValue([])
    const addProductToCollectionSpy = vi.spyOn(APIService, 'addProductToCollection').mockResolvedValue({
      ...secondCollection,
      productSlugs: ['product-slug'],
      entries: [{ kind: 'product', targetSlug: 'product-slug', order: 0 }],
    } as Collection)

    render(
      <MemoryRouter initialEntries={['/product/product-slug']}>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /product under test/i })

    await user.click(screen.getByRole('button', { name: /add to collection/i }))
    const dialog = await screen.findByRole('dialog')
    const secondCollectionCheckbox = within(dialog).getByLabelText(/second collection/i)

    await user.click(secondCollectionCheckbox)

    await waitFor(() => {
      expect(secondCollectionCheckbox).toHaveAttribute('aria-checked', 'true')
    })

    await user.click(within(dialog).getByRole('button', { name: /done/i }))

    await waitFor(() => {
      expect(addProductToCollectionSpy).toHaveBeenCalledTimes(1)
    })

    expect(addProductToCollectionSpy).toHaveBeenCalledWith('collection-2', 'product-slug')
    expect(addProductToCollectionSpy).not.toHaveBeenCalledWith('collection-1', 'product-slug')
  })

  it('removes a product only from the unchecked existing collection', async () => {
    const user = userEvent.setup()
    const product = createMockProduct({
      id: 'product-1',
      slug: 'product-slug',
      name: 'Product Under Test',
    })
    const userAccount = createMockUserAccount({
      id: 'user-1',
      username: 'test-user',
      role: 'user',
    })

    const existingCollection: Collection = {
      id: 'collection-1',
      slug: 'collection-1',
      name: 'Existing Collection',
      userId: userAccount.id,
      username: userAccount.username,
      productSlugs: ['product-slug'],
      entries: [{ kind: 'product', targetSlug: 'product-slug', order: 0 }],
      isPublic: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    vi.spyOn(APIService, 'getCurrentUser').mockResolvedValue(userAccount)
    vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([existingCollection])
    vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getProduct').mockResolvedValue(product)
    vi.spyOn(APIService, 'getAllRatings').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllDiscussions').mockResolvedValue([])
    vi.spyOn(APIService, 'getProductOwners').mockResolvedValue([])
    vi.spyOn(APIService, 'getMyRequests').mockResolvedValue([])
    const removeProductFromCollectionSpy = vi.spyOn(APIService, 'removeProductFromCollection').mockResolvedValue({
      ...existingCollection,
      productSlugs: [],
      entries: [],
    } as Collection)

    render(
      <MemoryRouter initialEntries={['/product/product-slug']}>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /product under test/i })

    await user.click(screen.getByRole('button', { name: /add to collection/i }))
    const dialog = await screen.findByRole('dialog')
    const existingCollectionCheckbox = within(dialog).getByLabelText(/existing collection/i)

    await waitFor(() => {
      expect(existingCollectionCheckbox).toHaveAttribute('aria-checked', 'true')
    })

    await user.click(existingCollectionCheckbox)
    await waitFor(() => {
      expect(existingCollectionCheckbox).toHaveAttribute('aria-checked', 'false')
    })

    await user.click(within(dialog).getByRole('button', { name: /done/i }))

    await waitFor(() => {
      expect(removeProductFromCollectionSpy).toHaveBeenCalledTimes(1)
    })

    expect(removeProductFromCollectionSpy).toHaveBeenCalledWith('collection-1', 'product-slug')
  })
})