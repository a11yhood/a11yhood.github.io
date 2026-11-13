import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductDetail } from '@/components/ProductDetail'
import { APIService } from '@/lib/api'
import type { Collection } from '@/lib/types'
import { createMockProduct, createMockUserAccount } from '../helpers/create-mocks'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('ProductDetail collection refresh ordering', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(['add', 'remove'] as const)('keeps the saved membership after %s when an earlier read finishes last', async (operation) => {
    const user = userEvent.setup()
    const product = createMockProduct({ id: 'product-uuid', slug: 'sample-product' })
    const account = createMockUserAccount({ id: 'owner-id', username: 'owner', role: 'user' })
    const empty: Collection = {
      id: 'collection-uuid', slug: 'my-tools', name: 'My Tools',
      userId: account.id, username: account.username!,
      entries: [], productSlugs: [], isPublic: true,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    }
    const populated: Collection = {
      ...empty, productSlugs: [product.slug!],
      entries: [{ kind: 'product', targetId: product.id, targetSlug: product.slug, order: 0 }],
    }
    const initial = operation === 'add' ? empty : populated
    const saved = operation === 'add' ? populated : empty
    const oldRead = deferred<Collection[]>()
    const write = deferred<void>()
    const read = vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([initial])
    vi.spyOn(APIService, 'getProductOwners').mockResolvedValue([])

    render(
      <MemoryRouter>
        <ProductDetail product={product} ratings={[]} discussions={[]}
          user={{ id: account.id, username: account.username! }} userAccount={account}
          userCollections={[initial]} allTags={[]}
          onBack={() => {}} onRate={() => {}} onDiscuss={() => {}} onAddTag={() => {}}
          onAddToCollection={() => write.promise} onRemoveFromCollection={() => write.promise}
        />
      </MemoryRouter>
    )
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Add to collection' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /My Tools/ }))

    // Closing starts a pre-save read. Hold it until the post-save refresh renders.
    read.mockImplementationOnce(() => oldRead.promise).mockResolvedValue([saved])
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await act(async () => write.resolve())
    await waitFor(() => {
      if (operation === 'add') expect(screen.getByRole('link', { name: 'My Tools' })).toBeInTheDocument()
      else expect(screen.queryByRole('link', { name: 'My Tools' })).not.toBeInTheDocument()
    })

    await act(async () => oldRead.resolve([initial]))
    if (operation === 'add') expect(screen.getByRole('link', { name: 'My Tools' })).toBeInTheDocument()
    else expect(screen.queryByRole('link', { name: 'My Tools' })).not.toBeInTheDocument()
  })
})
