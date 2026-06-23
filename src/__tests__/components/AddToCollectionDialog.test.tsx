import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    expect(screen.getByText('Editable by Username [editor]')).toBeInTheDocument()
    expect(screen.queryByText(/don't have editor access to any collections yet/i)).not.toBeInTheDocument()
  })

  it('does not show editor label for owned collections', () => {
    const ownedCollection: Collection = {
      ...baseCollection,
      id: 'collection-3',
      slug: 'collection-3',
      name: 'Owned Collection',
      userId: 'user-123',
      editorIds: ['user-123'],
      editorUsernames: ['editor-user'],
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[ownedCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        productSlug="product-1"
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
      />
    )

    expect(screen.getByText('Owned Collection')).toBeInTheDocument()
    expect(screen.queryByText('Owned Collection [editor]')).not.toBeInTheDocument()
  })

  it('submits collection entry targets when entriesToAdd is provided', async () => {
    const user = userEvent.setup()
    const onAddToCollection = vi.fn()
    const editableCollection: Collection = {
      ...baseCollection,
      id: 'collection-4',
      slug: 'collection-4',
      name: 'Editable Collection',
      userId: 'user-123',
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[editableCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        entriesToAdd={[
          {
            kind: 'collection',
            targetId: 'nested-collection-id',
            title: 'Nested Collection',
            order: 0,
          },
        ]}
        onAddToCollection={onAddToCollection}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
        allowRemoval={false}
      />
    )

    await user.click(screen.getByLabelText(/editable collection/i))
    await user.click(screen.getByRole('button', { name: /done/i }))

    expect(onAddToCollection).toHaveBeenCalledWith(
      'collection-4',
      [expect.objectContaining({ kind: 'collection', targetId: 'nested-collection-id' })]
    )
  })

  it('adds a product only to the collections that were newly checked', async () => {
    const user = userEvent.setup()
    const onAddToCollection = vi.fn()

    const firstCollection: Collection = {
      ...baseCollection,
      id: 'collection-12',
      slug: 'collection-12',
      name: 'First Collection',
      userId: 'user-123',
    }

    const secondCollection: Collection = {
      ...baseCollection,
      id: 'collection-13',
      slug: 'collection-13',
      name: 'Second Collection',
      userId: 'user-123',
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[firstCollection, secondCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        productSlug="product-1"
        onAddToCollection={onAddToCollection}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
        allowRemoval={false}
      />
    )

    await user.click(screen.getByLabelText(/second collection/i))
    await user.click(screen.getByRole('button', { name: /done/i }))

    expect(onAddToCollection).toHaveBeenCalledTimes(1)
    expect(onAddToCollection).toHaveBeenCalledWith('collection-13', ['product-1'])
    expect(onAddToCollection).not.toHaveBeenCalledWith('collection-12', ['product-1'])
  })

  it('removes a product from a collection when an existing checked membership is unchecked', async () => {
    const user = userEvent.setup()
    const onRemoveFromCollection = vi.fn()

    const existingCollection: Collection = {
      ...baseCollection,
      id: 'collection-14',
      slug: 'collection-14',
      name: 'Existing Collection',
      userId: 'user-123',
      productSlugs: ['product-1'],
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[existingCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        productSlug="product-1"
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={onRemoveFromCollection}
        onCreateNew={vi.fn()}
      />
    )

    const checkbox = screen.getByLabelText(/existing collection/i)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /done/i }))

    expect(onRemoveFromCollection).toHaveBeenCalledTimes(1)
    expect(onRemoveFromCollection).toHaveBeenCalledWith('collection-14', ['product-1'])
  })

  it('removes using entriesToAdd product targets when productSlug props are absent', async () => {
    const user = userEvent.setup()
    const onRemoveFromCollection = vi.fn()

    const existingCollection: Collection = {
      ...baseCollection,
      id: 'collection-19',
      slug: 'collection-19',
      name: 'Entry Target Collection',
      userId: 'user-123',
      productSlugs: ['product-1'],
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[existingCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        entriesToAdd={[
          {
            kind: 'product',
            targetSlug: 'product-1',
            targetId: 'product-id-1',
            order: 0,
          },
        ]}
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={onRemoveFromCollection}
        onCreateNew={vi.fn()}
      />
    )

    const checkbox = screen.getByLabelText(/entry target collection/i)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /done/i }))

    expect(onRemoveFromCollection).toHaveBeenCalledTimes(1)
    expect(onRemoveFromCollection).toHaveBeenCalledWith('collection-19', ['product-1'])
  })

  it('prechecks existing memberships when collections load after the dialog opens', () => {
    const lateLoadingCollection: Collection = {
      ...baseCollection,
      id: 'collection-15',
      slug: 'collection-15',
      name: 'Late Loading Collection',
      userId: 'user-123',
      productSlugs: ['product-1'],
    }

    const { rerender } = render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[]}
        currentUserId="user-123"
        currentUsername="editor-user"
        productSlug="product-1"
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
      />
    )

    rerender(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[lateLoadingCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        productSlug="product-1"
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/late loading collection/i)).toHaveAttribute('aria-checked', 'true')
  })

  it('prechecks a membership when entry has slug+id and collection stores product id', () => {
    const idBackedCollection: Collection = {
      ...baseCollection,
      id: 'collection-16',
      slug: 'collection-16',
      name: 'ID Backed Collection',
      userId: 'user-123',
      productIds: ['product-id-1'],
      productSlugs: [],
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[idBackedCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        entriesToAdd={[
          {
            kind: 'product',
            targetSlug: 'product-slug-1',
            targetId: 'product-id-1',
            order: 0,
          },
        ]}
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/id backed collection/i)).toHaveAttribute('aria-checked', 'true')
  })

  it('uses explicit preselectedCollectionKeys when provided', () => {
    const first: Collection = {
      ...baseCollection,
      id: 'collection-17',
      slug: 'collection-17',
      name: 'Explicit One',
      userId: 'user-123',
    }

    const second: Collection = {
      ...baseCollection,
      id: 'collection-18',
      slug: 'collection-18',
      name: 'Explicit Two',
      userId: 'user-123',
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[first, second]}
        currentUserId="user-123"
        currentUsername="editor-user"
        entriesToAdd={[
          { kind: 'product', targetSlug: 'not-used-for-explicit-mode', order: 0 },
        ]}
        preselectedCollectionKeys={['collection-17']}
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/explicit one/i)).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText(/explicit two/i)).toHaveAttribute('aria-checked', 'false')
  })

  it('hides source, descendants, and collections that already contain the source', () => {
    const sourceCollection: Collection = {
      ...baseCollection,
      id: 'collection-5',
      slug: 'collection-5',
      name: 'Source Collection',
      userId: 'user-123',
      entries: [
        { kind: 'collection', targetId: 'collection-6', title: 'Child Collection' },
      ],
    }

    const childCollection: Collection = {
      ...baseCollection,
      id: 'collection-6',
      slug: 'collection-6',
      name: 'Child Collection',
      userId: 'user-123',
    }

    const parentCollection: Collection = {
      ...baseCollection,
      id: 'collection-7',
      slug: 'collection-7',
      name: 'Parent Collection',
      userId: 'user-123',
      entries: [
        { kind: 'collection', targetId: sourceCollection.id, title: sourceCollection.name },
      ],
    }

    const unrelatedCollection: Collection = {
      ...baseCollection,
      id: 'collection-8',
      slug: 'collection-8',
      name: 'Unrelated Collection',
      userId: 'user-123',
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[sourceCollection, childCollection, parentCollection, unrelatedCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        entriesToAdd={[
          {
            kind: 'collection',
            targetId: sourceCollection.id,
            title: sourceCollection.name,
            order: 0,
          },
        ]}
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
        allowRemoval={false}
      />
    )

    expect(screen.queryByText('Source Collection')).not.toBeInTheDocument()
    expect(screen.queryByText('Child Collection')).not.toBeInTheDocument()
    expect(screen.queryByText('Parent Collection')).not.toBeInTheDocument()
    expect(screen.getByText('Unrelated Collection')).toBeInTheDocument()
    expect(screen.queryByText(/no valid target collections are available/i)).not.toBeInTheDocument()
  })

  it('allows targets that only indirectly include the source collection', () => {
    const sourceCollection: Collection = {
      ...baseCollection,
      id: 'collection-9',
      slug: 'collection-9',
      name: 'Source Collection',
      userId: 'user-123',
    }

    const childCollection: Collection = {
      ...baseCollection,
      id: 'collection-10',
      slug: 'collection-10',
      name: 'Child Collection',
      userId: 'user-123',
      entries: [
        { kind: 'collection', targetId: sourceCollection.id, title: sourceCollection.name },
      ],
    }

    const ancestorCollection: Collection = {
      ...baseCollection,
      id: 'collection-11',
      slug: 'collection-11',
      name: 'Ancestor Collection',
      userId: 'user-123',
      entries: [
        { kind: 'collection', targetId: childCollection.id, title: childCollection.name },
      ],
    }

    render(
      <AddToCollectionDialog
        open={true}
        onOpenChange={vi.fn()}
        collections={[sourceCollection, childCollection, ancestorCollection]}
        currentUserId="user-123"
        currentUsername="editor-user"
        entriesToAdd={[
          {
            kind: 'collection',
            targetId: sourceCollection.id,
            title: sourceCollection.name,
            order: 0,
          },
        ]}
        onAddToCollection={vi.fn()}
        onRemoveFromCollection={vi.fn()}
        onCreateNew={vi.fn()}
        allowRemoval={false}
      />
    )

    expect(screen.getByText('Ancestor Collection')).toBeInTheDocument()
    expect(screen.queryByText('Child Collection')).not.toBeInTheDocument()
  })
})
