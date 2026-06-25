import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { CollectionsPage } from '@/pages/CollectionsPage'
import { APIService } from '@/lib/api'
import type { Collection, UserAccount, UserData } from '@/lib/types'

const user = {
  id: 'user-1',
  username: 'alice',
} as UserData

const userAccount = {
  id: 'user-1',
  username: 'alice',
  role: 'user',
} as UserAccount

const baseCollection = {
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  productSlugs: [],
} satisfies Partial<Collection>

const renderPage = ({
  collections,
  collectionsLoaded,
  currentUser = user,
  currentUserAccount = userAccount,
}: {
  collections: Collection[]
  collectionsLoaded: boolean
  currentUser?: UserData | null
  currentUserAccount?: UserAccount | null
}) => render(
  <MemoryRouter>
    <CollectionsPage
      collections={collections}
      collectionsLoaded={collectionsLoaded}
      products={[]}
      user={currentUser}
      userAccount={currentUserAccount}
      onDeleteCollection={vi.fn()}
      onEditCollection={vi.fn()}
      onCreateCollection={vi.fn()}
      onOpenAddToCollection={vi.fn()}
    />
  </MemoryRouter>
)

describe('CollectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getProduct').mockResolvedValue(null as never)
  })

  it('renders shared collection state without refetching collection lists', () => {
    renderPage({
      collectionsLoaded: true,
      collections: [
        {
          ...baseCollection,
          id: 'owned-1',
          slug: 'owned-1',
          name: 'Owned Collection',
          userId: 'user-1',
          username: 'alice',
          isPublic: false,
        } as Collection,
        {
          ...baseCollection,
          id: 'editor-1',
          slug: 'editor-1',
          name: 'Editor Collection',
          userId: 'user-2',
          username: 'bob',
          editorIds: ['user-1'],
          editorUsernames: ['alice'],
          isPublic: false,
        } as Collection,
        {
          ...baseCollection,
          id: 'public-1',
          slug: 'public-1',
          name: 'Public Collection',
          userId: 'user-3',
          username: 'carol',
          isPublic: true,
        } as Collection,
      ],
    })

    expect(screen.getByText('Owned Collection')).toBeInTheDocument()
    expect(screen.getByText('Editor Collection')).toBeInTheDocument()
    expect(screen.getByText('Public Collection')).toBeInTheDocument()
    expect(APIService.getPublicCollections).not.toHaveBeenCalled()
    expect(APIService.getUserCollections).not.toHaveBeenCalled()
  })

  it('shows a loading state while shared collections are still hydrating', () => {
    renderPage({
      collections: [],
      collectionsLoaded: false,
      currentUser: null,
      currentUserAccount: null,
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Collections' })).toBeInTheDocument()
    expect(screen.getAllByText(/Loading/).length).toBeGreaterThan(0)
  })
})