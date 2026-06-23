import { describe, expect, it } from 'vitest'
import type { Collection, Product } from '@/lib/types'
import {
  buildAddToCollectionDefaults,
  buildAddToCollectionDefaultsForCollection,
  buildAddToCollectionDefaultsForProducts,
  deriveRemovalProductTargets,
  normalizeProductTargets,
} from '@/lib/addToCollection'

describe('addToCollection defaults builder', () => {
  it('creates entries with slug+id and computes preselected collection keys', () => {
    const products: Pick<Product, 'id' | 'slug'>[] = [
      { id: 'p1', slug: 'product-one' },
    ]

    const collections: Collection[] = [
      {
        id: 'c1',
        slug: 'collection-one',
        name: 'Collection One',
        userId: 'u1',
        username: 'user-one',
        entries: [],
        productSlugs: ['product-one'],
        isPublic: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    const defaults = buildAddToCollectionDefaultsForProducts(products, collections)

    expect(defaults.entries).toEqual([
      {
        kind: 'product',
        targetSlug: 'product-one',
        targetId: 'p1',
        order: 0,
      },
    ])
    expect(defaults.preselectedCollectionKeys).toEqual(['collection-one'])
  })

  it('normalizes and derives removal product targets from entries first', () => {
    const fromEntries = deriveRemovalProductTargets(
      [
        { kind: 'product', targetSlug: ' product-one ', targetId: 'p1' },
        { kind: 'product', targetId: 'p1' },
      ],
      ['fallback-product']
    )

    expect(fromEntries).toEqual(['product-one', 'p1'])

    const fromFallback = deriveRemovalProductTargets([], ['  product-two  ', 'product-two'])
    expect(fromFallback).toEqual(['product-two'])

    expect(normalizeProductTargets([' a ', 'a', '', ' b '])).toEqual(['a', 'b'])
  })

  it('builds defaults for collection-to-collection flows', () => {
    const defaults = buildAddToCollectionDefaultsForCollection({
      id: 'source-collection',
      slug: 'source-collection',
      name: 'Source Collection',
      description: 'source description',
    })

    expect(defaults.name).toBe('From Collection: Source Collection')
    expect(defaults.description).toBe('Collection entry for Source Collection')
    expect(defaults.isPublic).toBe(false)
    expect(defaults.entries).toEqual([
      {
        kind: 'collection',
        targetId: 'source-collection',
        targetSlug: 'source-collection',
        title: 'Source Collection',
        description: 'source description',
        order: 0,
      },
    ])
  })

  it('normalizes generic add-to-collection defaults payload', () => {
    const defaults = buildAddToCollectionDefaults({
      name: 'My defaults',
      description: 'desc',
      isPublic: true,
      entries: [
        { kind: 'product', targetId: 'p1' },
        { kind: 'collection', targetId: 'c1', order: 5 },
      ],
      preselectedCollectionKeys: ['one', 'one', 'two'],
    })

    expect(defaults.entries).toEqual([
      { kind: 'product', targetId: 'p1', order: 0 },
      { kind: 'collection', targetId: 'c1', order: 5 },
    ])
    expect(defaults.preselectedCollectionKeys).toEqual(['one', 'two'])
  })
})
