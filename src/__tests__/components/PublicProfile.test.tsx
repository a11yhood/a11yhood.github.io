import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PublicProfile } from '@/components/PublicProfile'
import { APIService } from '@/lib/api'
import type { Collection, Product, UserAccount } from '@/lib/types'

const mockAccount: UserAccount = {
  id: 'user-uuid-1',
  username: 'testuser',
  role: 'user',
  createdAt: new Date('2024-01-01').toISOString(),
}

const defaultStats = {
  productsSubmitted: 0,
  ratingsGiven: 0,
  discussionsParticipated: 0,
  totalContributions: 0,
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(APIService, 'getUserByUsername').mockResolvedValue(mockAccount)
  vi.spyOn(APIService, 'getUserStats').mockResolvedValue(defaultStats)
  vi.spyOn(APIService, 'getOwnedProducts').mockResolvedValue([])
  vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([])
  vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
})

describe('PublicProfile', () => {
  it('calls getUserByUsername with the route username prop', async () => {
    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(APIService.getUserByUsername).toHaveBeenCalledWith('testuser')
    })
  })

  it('calls getUserStats and getOwnedProducts while loading profile data', async () => {
    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(APIService.getUserStats).toHaveBeenCalledWith('testuser')
      expect(APIService.getOwnedProducts).toHaveBeenCalledWith('user-uuid-1')
    })
  })

  it('shows error state when getUserByUsername rejects', async () => {
    vi.spyOn(APIService, 'getUserByUsername').mockRejectedValue(new Error('Network error'))

    render(
      <MemoryRouter>
        <PublicProfile username="unknownuser" />
      </MemoryRouter>
    )

    expect(await screen.findByText('Could not load user profile')).toBeInTheDocument()
  })

  it('shows "User not found" when getUserByUsername returns null', async () => {
    vi.spyOn(APIService, 'getUserByUsername').mockResolvedValue(null)

    render(
      <MemoryRouter>
        <PublicProfile username="ghost" />
      </MemoryRouter>
    )

    expect(await screen.findByText('User not found')).toBeInTheDocument()
  })

  it('renders profile heading when account loads successfully', async () => {
    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: /profile/i })).toBeInTheDocument()
  })

  it('uses editable products count when productsSubmitted is behind', async () => {
    const editableProduct = {
      id: 'product-1',
      name: 'ProgramAT',
      createdAt: Date.now(),
      submittedBy: 'user-uuid-1',
    } as unknown as Product
    vi.spyOn(APIService, 'getOwnedProducts').mockResolvedValue([editableProduct])

    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    const productsLabel = await screen.findByText(/^Products$/)
    const totalLabel = await screen.findByText(/^Total$/)

    expect(productsLabel.previousElementSibling).toHaveTextContent('1')
    expect(totalLabel.previousElementSibling).toHaveTextContent('1')
  })

  it('shows collection count in contribution statistics', async () => {
    const ownedCollection = {
      id: 'col-1',
      slug: 'my-collection',
      name: 'My Collection',
      userId: 'user-uuid-1',
      username: 'testuser',
      productSlugs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: true,
    } as unknown as Collection
    vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([ownedCollection])

    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    const collectionsLabel = await screen.findByText(/^Collections$/)
    expect(collectionsLabel.previousElementSibling).toHaveTextContent('1')
  })

  it('renders linked products and collections with owner/editor labels', async () => {
    const ownedProduct = {
      id: 'product-1',
      slug: 'owned-product',
      name: 'Owned Product',
      createdAt: Date.now(),
      submittedBy: 'user-uuid-1',
      editorIds: ['user-uuid-1'],
    } as unknown as Product
    const editedProduct = {
      id: 'product-2',
      slug: 'edited-product',
      name: 'Edited Product',
      createdAt: Date.now(),
      submittedBy: 'different-user',
      editorIds: ['user-uuid-1'],
    } as unknown as Product
    vi.spyOn(APIService, 'getOwnedProducts').mockResolvedValue([ownedProduct, editedProduct])

    const ownedCollection = {
      id: 'col-1',
      slug: 'owned-collection',
      name: 'Owned Collection',
      userId: 'user-uuid-1',
      username: 'testuser',
      editorIds: [],
      productSlugs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: true,
    } as unknown as Collection
    const editedCollection = {
      id: 'col-2',
      slug: 'edited-collection',
      name: 'Edited Collection',
      userId: 'different-user',
      username: 'other',
      editorIds: ['user-uuid-1'],
      productSlugs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: true,
    } as unknown as Collection
    vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([ownedCollection, editedCollection])

    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    expect(await screen.findByRole('link', { name: 'Owned Product' })).toHaveAttribute('href', '/product/owned-product')
    expect(await screen.findByRole('link', { name: 'Edited Product' })).toHaveAttribute('href', '/product/edited-product')
    expect(await screen.findByRole('link', { name: 'Owned Collection' })).toHaveAttribute('href', '/collections/owned-collection')
    expect(await screen.findByRole('link', { name: 'Edited Collection' })).toHaveAttribute('href', '/collections/edited-collection')

    expect(screen.getAllByText('(owner)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('(editor)').length).toBeGreaterThan(0)
  })
})
