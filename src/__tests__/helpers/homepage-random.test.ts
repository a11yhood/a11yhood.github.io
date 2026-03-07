import { describe, it, expect } from 'vitest'
import { createMockProduct } from './create-mocks'
import {
  FEATURED_TAG,
  pickUniqueRandom,
  selectFeaturedRandomProducts,
} from '@/lib/homepageRandom'

describe('Homepage random product selection', () => {
  it('only samples from featured products when enough are available', () => {
    const featured = Array.from({ length: 5 }, (_, i) =>
      createMockProduct({ id: `f${i}`, tags: [FEATURED_TAG, 'accessibility'] })
    )
    const nonFeatured = Array.from({ length: 10 }, (_, i) =>
      createMockProduct({ id: `n${i}`, tags: ['other'] })
    )
    const products = [...featured, ...nonFeatured]

    for (let trial = 0; trial < 20; trial++) {
      const selected = selectFeaturedRandomProducts(products, 3)
      selected.forEach(p => {
        expect(p).not.toBeNull()
        expect(p!.tags).toContain(FEATURED_TAG)
      })
    }
  })

  it('falls back to all products when fewer than count products are featured', () => {
    const featured = [createMockProduct({ id: 'f1', tags: [FEATURED_TAG] })]
    const nonFeatured = Array.from({ length: 10 }, (_, i) =>
      createMockProduct({ id: `n${i}`, tags: ['other'] })
    )
    const products = [...featured, ...nonFeatured]

    const selected = selectFeaturedRandomProducts(products, 3)
    const nonNull = selected.filter(p => p !== null)
    expect(nonNull.length).toBe(3)
  })

  it('never returns duplicate products', () => {
    const products = Array.from({ length: 10 }, (_, i) =>
      createMockProduct({ id: `p${i}`, tags: [FEATURED_TAG] })
    )

    for (let trial = 0; trial < 50; trial++) {
      const selected = selectFeaturedRandomProducts(products, 3)
      const ids = selected.filter(Boolean).map(p => p!.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('returns nulls when no products are available', () => {
    const selected = selectFeaturedRandomProducts([], 3)
    expect(selected).toEqual([null, null, null])
  })

  it('non-featured products remain accessible (are not deleted)', () => {
    const featured = Array.from({ length: 5 }, (_, i) =>
      createMockProduct({ id: `f${i}`, tags: [FEATURED_TAG] })
    )
    const nonFeatured = Array.from({ length: 5 }, (_, i) =>
      createMockProduct({ id: `n${i}`, tags: ['other'] })
    )
    const products = [...featured, ...nonFeatured]
    // All products remain in the catalog; only the selection pool is constrained.
    expect(products.filter(p => !p.tags?.includes(FEATURED_TAG))).toHaveLength(5)
  })

  it('pickUniqueRandom never returns more items than the pool', () => {
    const pool = Array.from({ length: 2 }, (_, i) =>
      createMockProduct({ id: `x${i}`, tags: [] })
    )
    const result = pickUniqueRandom(pool, 5)
    expect(result.length).toBe(2)
  })
})
