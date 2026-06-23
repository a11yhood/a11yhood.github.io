import { describe, expect, it } from 'vitest'
import { serializeCollectionEntryForCreate, serializeCollectionEntryForUpdate } from '@/lib/collectionEntrySerialization'

describe('serializeCollectionEntryForUpdate', () => {
  it('serializes nested collection entries using backend field names', () => {
    expect(
      serializeCollectionEntryForUpdate({
        kind: 'collection',
        targetId: 'collection-1',
        title: 'Parent Collection',
        description: 'Nested collection target',
        order: 2,
        pinned: true,
      })
    ).toEqual({
      kind: 'collection',
      collectionId: 'collection-1',
      label: 'Parent Collection',
      position: 2,
    })
  })

  it('serializes product entries using backend field names', () => {
    expect(
      serializeCollectionEntryForUpdate({
        kind: 'product',
        targetSlug: 'test-product-from-github',
        title: 'Test Product',
        order: 0,
      })
    ).toEqual({
      kind: 'product',
      productId: 'test-product-from-github',
      label: 'Test Product',
      position: 0,
    })
  })
})

describe('serializeCollectionEntryForCreate', () => {
  it('serializes product entries with nested product.product_id shape', () => {
    expect(
      serializeCollectionEntryForCreate({
        kind: 'product',
        targetId: 'product-1',
        title: 'Test Product',
        order: 0,
      })
    ).toEqual({
      kind: 'product',
      product_id: 'product-1',
      label: 'Test Product',
      position: 0,
    })
  })

  it('serializes collection entries with flat collection_id shape', () => {
    expect(
      serializeCollectionEntryForCreate({
        kind: 'collection',
        targetId: 'collection-1',
        title: 'Nested Collection',
        order: 1,
      })
    ).toEqual({
      kind: 'collection',
      collection_id: 'collection-1',
      label: 'Nested Collection',
      position: 1,
    })
  })

  it('accepts legacy collectionId field when targetId is absent', () => {
    expect(
      serializeCollectionEntryForCreate({
        kind: 'collection',
        collectionId: 'legacy-collection-id',
      } as any)
    ).toEqual({
      kind: 'collection',
      collection_id: 'legacy-collection-id',
    })
  })

  it('accepts legacy productId field when targetId is absent', () => {
    expect(
      serializeCollectionEntryForCreate({
        kind: 'product',
        productId: 'legacy-product-id',
      } as any)
    ).toEqual({
      kind: 'product',
      product_id: 'legacy-product-id',
    })
  })
})