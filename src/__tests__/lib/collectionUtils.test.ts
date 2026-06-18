import { describe, expect, it } from 'vitest'
import { getCollectionEntries, resolveCollectionProducts } from '@/lib/collectionUtils'
import type { Collection, Product } from '@/lib/types'

describe('collectionUtils', () => {
  it('hydrates product entry targets from fallback productSlugs when entries omit targets', () => {
    const collection = {
      entries: [
        { kind: 'product', title: 'Product 1', order: 0 },
      ],
      productSlugs: ['product-1'],
      productIds: [],
    } as Pick<Collection, 'entries' | 'productIds' | 'productSlugs'>

    const entries = getCollectionEntries(collection)
    expect(entries).toHaveLength(1)
    expect(entries[0].targetSlug).toBe('product-1')
  })

  it('resolves products when canonical entries are missing targets but derived productSlugs exist', () => {
    const collection = {
      id: 'collection-1',
      slug: 'collection-1',
      entries: [
        { kind: 'product', title: 'Product 1' },
      ],
      productSlugs: ['product-1'],
      productIds: [],
    } as Pick<Collection, 'entries' | 'productIds' | 'productSlugs' | 'slug' | 'id'>

    const products: Product[] = [
      {
        id: 'product-1-id',
        slug: 'product-1',
        name: 'Product 1',
        type: 'Software',
        source: 'GitHub',
        description: 'test',
        tags: [],
        createdAt: Date.now(),
      },
    ]

    const resolved = resolveCollectionProducts(collection, [], products)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].name).toBe('Product 1')
  })

  it('resolves products when entry target includes a prefixed UUID key', () => {
    const uuid = '3be25bdd-9d94-4ba2-ae22-1f394bc9038d'
    const collection = {
      id: 'collection-1',
      slug: 'collection-1',
      entries: [
        { kind: 'product', targetSlug: `test-product-${uuid}` },
      ],
      productSlugs: [],
      productIds: [],
    } as Pick<Collection, 'entries' | 'productIds' | 'productSlugs' | 'slug' | 'id'>

    const products: Product[] = [
      {
        id: uuid,
        slug: 'test-product',
        name: 'Human Product Name',
        type: 'Software',
        source: 'GitHub',
        description: 'test',
        tags: [],
        createdAt: Date.now(),
      },
    ]

    const resolved = resolveCollectionProducts(collection, [], products)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].name).toBe('Human Product Name')
  })
})
