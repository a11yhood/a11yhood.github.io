import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AddToCollectionDialog } from '@/components/AddToCollectionDialog'
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

describe('AddToCollectionDialog', () => {
  it('shows collections where the user is an editor by username', () => {
    const editableByUsername: Collection = {
      ...baseCollection,
      id: 'collection-2',
      slug: 'collection-2',
      name: 'Editable by Username',
      editorIds: [],
      editorUsernames: ['editor-user'],
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[editableByUsername]}
        currentUserId="user-123"
        currentUsername="editor-user"
        productSlug="product-1"
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
      />
    )

    expect(screen.getByText('Editable by Username')).toBeInTheDocument()
    expect(screen.queryByText(/don't have editor access to any collections yet/i)).not.toBeInTheDocument()
  })
})
