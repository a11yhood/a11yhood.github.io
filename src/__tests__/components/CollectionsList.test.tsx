import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CollectionsList } from '@/components/CollectionsList'
import type { Collection } from '@/lib/types'

const baseCollection: Collection = {
  id: 'collection-1',
  slug: 'collection-1',
  name: 'Collection 1',
  userId: 'owner-1',
  username: 'owner-1',
  productSlugs: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isPublic: true,
}

const renderList = (collections: Collection[], currentUserId?: string) => {
  return render(
    <MemoryRouter>
      <CollectionsList
        collections={collections}
        products={[]}
        onSelectCollection={vi.fn()}
        onDeleteCollection={vi.fn()}
        currentUserId={currentUserId}
      />
    </MemoryRouter>
  )
}

describe('CollectionsList', () => {
  it('shows plain title for editor-only collections', () => {
    const editorCollection: Collection = {
      ...baseCollection,
      id: 'collection-2',
      slug: 'collection-2',
      name: 'Editor Collection',
      editorIds: ['user-123'],
    }

    renderList([editorCollection], 'user-123')

    expect(screen.getByText('Editor Collection')).toBeInTheDocument()
    expect(screen.queryByText('Editor Collection [editor]')).not.toBeInTheDocument()
  })

  it('does not show [editor] label for owned collections', () => {
    const ownedCollection: Collection = {
      ...baseCollection,
      id: 'collection-3',
      slug: 'collection-3',
      name: 'Owned Collection',
      userId: 'user-123',
      editorIds: ['user-123'],
    }

    renderList([ownedCollection], 'user-123')

    expect(screen.getByText('Owned Collection')).toBeInTheDocument()
    expect(screen.queryByText('Owned Collection [editor]')).not.toBeInTheDocument()
  })

  it('shows plain title when backend provides editorUsernames', () => {
    const editorCollection: Collection = {
      ...baseCollection,
      id: 'collection-4',
      slug: 'collection-4',
      name: 'Editor By Username',
      userId: 'owner-4',
      editorIds: [],
      editorUsernames: ['dev_user'],
    }

    render(
      <MemoryRouter>
        <CollectionsList
          collections={[editorCollection]}
          products={[]}
          onSelectCollection={vi.fn()}
          onDeleteCollection={vi.fn()}
          currentUserId="user-123"
          currentUsername="dev_user"
        />
      </MemoryRouter>
    )

    expect(screen.getByText('Editor By Username')).toBeInTheDocument()
    expect(screen.queryByText('Editor By Username [editor]')).not.toBeInTheDocument()
  })

})
