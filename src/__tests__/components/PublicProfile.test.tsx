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
  collectionsCreated: 0,
  productsOwnedSubmitted: 0,
  productsEditedManaged: 0,
  collectionsOwnedSubmitted: 0,
  collectionsEditedManaged: 0,
  ratingsGiven: 0,
  discussionsParticipated: 0,
  totalContributions: 0,
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(APIService, 'getUserByUsername').mockResolvedValue(mockAccount)
  vi.spyOn(APIService, 'getUserStats').mockResolvedValue(defaultStats)
  vi.spyOn(APIService, 'getOwnedProducts').mockResolvedValue([])
  vi.spyOn(APIService, 'getUserPublicCollections').mockResolvedValue([])
  vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
  vi.spyOn(APIService, 'getAllProducts').mockResolvedValue([])
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
      expect(APIService.getUserStats).toHaveBeenCalledWith('user-uuid-1')
      expect(APIService.getOwnedProducts).toHaveBeenCalledWith('testuser')
      expect(APIService.getUserPublicCollections).toHaveBeenCalledWith('testuser')
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

  it('uses backend productsSubmitted count without frontend correction', async () => {
    const editableProduct = {
      id: 'product-1',
      name: 'ProgramAT',
      createdAt: Date.now(),
      createdBy: 'user-uuid-1',
    } as unknown as Product
    vi.spyOn(APIService, 'getOwnedProducts').mockResolvedValue([editableProduct])

    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    const productsLabel = await screen.findByText(/^Products$/)
    const totalLabel = await screen.findByText(/^Total$/)

    expect(productsLabel.previousElementSibling).toHaveTextContent('0')
    expect(totalLabel.previousElementSibling).toHaveTextContent('0')
  })

  it('uses backend collection count without frontend correction', async () => {
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
    vi.spyOn(APIService, 'getUserPublicCollections').mockResolvedValue([ownedCollection])

    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    const collectionsLabel = await screen.findByText(/^Collections$/)
    expect(collectionsLabel.previousElementSibling).toHaveTextContent('0')
  })

  it('renders linked products and collections with owner/editor labels', async () => {
    const ownedProduct = {
      id: 'product-1',
      slug: 'owned-product',
      name: 'Owned Product',
      createdAt: Date.now(),
      createdBy: 'user-uuid-1',
      editorIds: [],
    } as unknown as Product
    const editedProduct = {
      id: 'product-2',
      slug: 'edited-product',
      name: 'Edited Product',
      createdAt: Date.now(),
      createdBy: 'different-user',
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
    vi.spyOn(APIService, 'getUserPublicCollections').mockResolvedValue([ownedCollection, editedCollection])

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

  it('does not fall back to public product index when owned-products endpoint is unauthorized', async () => {
    vi.spyOn(APIService, 'getOwnedProducts').mockRejectedValue({ status: 401 })
    const getAllProductsSpy = vi.spyOn(APIService, 'getAllProducts').mockResolvedValue([])

    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /profile/i })

    expect(getAllProductsSpy).not.toHaveBeenCalled()

    const productsLabel = await screen.findByText(/^Products$/)
    const totalLabel = await screen.findByText(/^Total$/)

    expect(productsLabel.previousElementSibling).toHaveTextContent('0')
    expect(totalLabel.previousElementSibling).toHaveTextContent('0')
  })
})
