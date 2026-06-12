import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describeWithBackend } from '../helpers/with-backend'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { ProductDetail } from '@/components/ProductDetail'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import type { Product, UserAccount, UserData } from '@/lib/types'

type UserStats = {
  productsSubmitted: number
  collectionsCreated: number
  productsOwnedSubmitted?: number
  productsEditedManaged?: number
  collectionsOwnedSubmitted?: number
  collectionsEditedManaged?: number
  ratingsGiven: number
  discussionsParticipated: number
  totalContributions: number
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

describeWithBackend('Owned + edited membership sequence', () => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const userToken = getDevToken(DEV_USERS.user.role)
  const moderatorToken = getDevToken(DEV_USERS.moderator.role)
  const adminToken = getDevToken(DEV_USERS.admin.role)

  let userAccount: UserAccount
  let user: UserData
  let baselineStats: UserStats

  let ownedProduct: Product
  let editedProduct: Product

  let ownedCollectionSlug = ''
  let editedCollectionSlug = ''
  let ownedCollectionName = ''
  let editedCollectionName = ''

  const setToken = (token: string) => {
    setAuthTokenGetter(async () => token)
  }

  const getStats = async () => {
    const statsUserRef = user.id || user.username
    return APIService.getUserStats(statsUserRef)
  }

  beforeAll(async () => {
    setToken(userToken)
    const me = await APIService.getCurrentUser()
    if (!me?.id || !me.username) {
      throw new Error('Failed to resolve seeded regular user identity for test sequence')
    }

    userAccount = me
    user = {
      id: me.id,
      username: me.username,
      avatarUrl: me.avatarUrl,
    }

    baselineStats = await getStats()

    ownedProduct = await APIService.createProduct({
      name: `Owned Product ${unique}`,
      type: 'Software',
      source: 'user-submitted',
      sourceUrl: `https://github.com/a11yhood/owned-${unique}`,
      description: 'Owned product for stats and collections integration sequence test',
      tags: ['integration', 'owned'],
    })

    ownedCollectionName = `Owned Collection ${unique}`
    const ownedCollection = await APIService.createCollection({
      name: ownedCollectionName,
      description: 'Owned collection fixture for membership sequence',
      isPublic: true,
      username: user.username,
      productSlugs: [],
    })
    ownedCollectionSlug = ownedCollection.slug || ownedCollection.id

    setToken(moderatorToken)

    editedProduct = await APIService.createProduct({
      name: `Edited Product ${unique}`,
      type: 'Software',
      source: 'user-submitted',
      sourceUrl: `https://github.com/a11yhood/edited-${unique}`,
      description: 'Edited product fixture for membership sequence',
      tags: ['integration', 'edited'],
    })

    await APIService.addProductOwner(editedProduct.id, user.id)

    editedCollectionName = `Edited Collection ${unique}`
    const editedCollection = await APIService.createCollection({
      name: editedCollectionName,
      description: 'Edited collection fixture for membership sequence',
      isPublic: true,
      username: DEV_USERS.moderator.username,
      productSlugs: [],
    })
    editedCollectionSlug = editedCollection.slug || editedCollection.id
    await APIService.addCollectionEditor(editedCollectionSlug, user.id)

    setToken(userToken)
  }, 30000)

  afterAll(async () => {
    setToken(adminToken)

    if (ownedCollectionSlug) {
      await APIService.deleteCollection(ownedCollectionSlug).catch(() => undefined)
    }
    if (editedCollectionSlug) {
      await APIService.deleteCollection(editedCollectionSlug).catch(() => undefined)
    }

    if (ownedProduct?.slug || ownedProduct?.id) {
      await APIService.deleteProduct(ownedProduct.slug || ownedProduct.id).catch(() => undefined)
    }
    if (editedProduct?.slug || editedProduct?.id) {
      await APIService.deleteProduct(editedProduct.slug || editedProduct.id).catch(() => undefined)
    }
  })

  it('updates stats for owned and edited products/collections', async () => {
    await waitFor(
      async () => {
        const nextStats = await getStats()

        expect(asCount(nextStats.productsOwnedSubmitted)).toBeGreaterThanOrEqual(
          asCount(baselineStats.productsOwnedSubmitted) + 1
        )
        expect(asCount(nextStats.productsEditedManaged)).toBeGreaterThanOrEqual(
          asCount(baselineStats.productsEditedManaged) + 1
        )
        expect(asCount(nextStats.collectionsOwnedSubmitted)).toBeGreaterThanOrEqual(
          asCount(baselineStats.collectionsOwnedSubmitted) + 1
        )
        expect(asCount(nextStats.collectionsEditedManaged)).toBeGreaterThanOrEqual(
          asCount(baselineStats.collectionsEditedManaged) + 1
        )
      },
      { timeout: 15000, interval: 500 }
    )
  })

  it('shows owned and edited collections with correct labels in Add to Collection dialog', async () => {
    // Backend contract: authenticated /collections returns both owned and edited collections.
    const userEditableCollections = await APIService.getUserCollections()
    
    const testOwnedCollection = userEditableCollections.find(c => c.name === ownedCollectionName)
    const testEditedCollection = userEditableCollections.find(c => c.name === editedCollectionName)
    
    if (!testOwnedCollection) {
      throw new Error(`Could not find owned collection: ${ownedCollectionName}`)
    }
    if (!testEditedCollection) {
      throw new Error(`Could not find edited collection: ${editedCollectionName}`)
    }

    // Verify the API returned both collections with correct membership status
    const isOwnerOfOwnedCollection = testOwnedCollection.userId === user.id
    const isEditorOfEditedCollection = (testEditedCollection.editorIds || []).includes(user.id)
    
    expect(isOwnerOfOwnedCollection).toBe(true)
    expect(isEditorOfEditedCollection).toBe(true)

    const productForDetail = {
      ...ownedProduct,
      slug: ownedProduct.slug || ownedProduct.id,
    }

    render(
      <MemoryRouter>
        <ProductDetail
          product={productForDetail}
          ratings={[]}
          discussions={[]}
          user={user}
          userAccount={userAccount}
          userCollections={userEditableCollections}
          onBack={vi.fn()}
          onRate={vi.fn()}
          onDiscuss={vi.fn()}
          onAddTag={vi.fn()}
          allTags={[]}
          onAddToCollection={async () => undefined}
          onRemoveFromCollection={async () => undefined}
        />
      </MemoryRouter>
    )

    const trigger = await screen.findByRole('button', { name: /add to collection/i })
    await userEvent.setup().click(trigger)

    await screen.findByRole('heading', { name: /add to collection/i })

    // Verify both collections appear in the dialog
    await waitFor(
      () => {
        expect(screen.getByText(ownedCollectionName)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
    
    // Verify owned collection does NOT have [editor] label (user is owner)
    expect(screen.queryByText(`${ownedCollectionName} [editor]`)).not.toBeInTheDocument()
    
    // Verify edited collection HAS [editor] label (user is editor, not owner)
    await waitFor(
      () => {
        const editedLabel = screen.queryByText(`${editedCollectionName} [editor]`)
        expect(editedLabel).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 25000)

  it('shows an editor-only collection when user opens product and clicks add to collection', async () => {
    // Ensure backend recognizes this user as editor (not owner) on the target collection.
    const editorOnlyCollection = await APIService.getCollection(editedCollectionSlug)
    if (!editorOnlyCollection) {
      throw new Error(`Could not fetch edited collection: ${editedCollectionSlug}`)
    }

    expect(editorOnlyCollection.userId).not.toBe(user.id)
    expect(editorOnlyCollection.editorIds || []).toContain(user.id)

    const productForDetail = {
      ...editedProduct,
      slug: editedProduct.slug || editedProduct.id,
    }

    render(
      <MemoryRouter>
        <ProductDetail
          product={productForDetail}
          ratings={[]}
          discussions={[]}
          user={user}
          userAccount={userAccount}
          onBack={vi.fn()}
          onRate={vi.fn()}
          onDiscuss={vi.fn()}
          onAddTag={vi.fn()}
          allTags={[]}
          onAddToCollection={async () => undefined}
          onRemoveFromCollection={async () => undefined}
        />
      </MemoryRouter>
    )

    const trigger = await screen.findByRole('button', { name: /add to collection/i })
    await userEvent.setup().click(trigger)

    await screen.findByRole('heading', { name: /add to collection/i })

    // The collection must appear for editor access, and it must be labeled as editor-only.
    await waitFor(
      () => {
        expect(screen.getByText(`${editedCollectionName} [editor]`)).toBeInTheDocument()
      },
      { timeout: 10000 }
    )
  }, 30000)
})