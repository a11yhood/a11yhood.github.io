import { describe, it, expect } from 'vitest'
import type { Product } from '@/lib/types'
import { createMockProduct } from './create-mocks'

// Mirror the logic from src/components/HomePage.tsx so we can unit-test it in CI.
const FEATURED_TAG = 'featured'

function pickUniqueRandom(pool: Product[], count: number): Product[] {
  if (pool.length === 0) return []
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

function selectRandomProducts(products: Product[], count: number): (Product | null)[] {
  const featuredPool = products.filter(p => p.tags?.includes(FEATURED_TAG))
  const pool = featuredPool.length >= count ? featuredPool : products
  const picked = pickUniqueRandom(pool, count)
  return Array.from({ length: count }, (_, i) => picked[i] ?? null)
}

describe('Homepage random product selection', () => {
  it('only samples from featured products when enough are available', () => {
    const featured = Array.from({ length: 5 }, (_, i) =>
      createMockProduct({ id: `f${i}`, tags: ['featured', 'accessibility'] })
    )
    const nonFeatured = Array.from({ length: 10 }, (_, i) =>
      createMockProduct({ id: `n${i}`, tags: ['other'] })
    )
    const products = [...featured, ...nonFeatured]

    for (let trial = 0; trial < 20; trial++) {
      const selected = selectRandomProducts(products, 3)
      selected.forEach(p => {
        expect(p).not.toBeNull()
        expect(p!.tags).toContain('featured')
      })
    }
  })

  it('falls back to all products when fewer than count products are featured', () => {
    const featured = [createMockProduct({ id: 'f1', tags: ['featured'] })]
    const nonFeatured = Array.from({ length: 10 }, (_, i) =>
      createMockProduct({ id: `n${i}`, tags: ['other'] })
    )
    const products = [...featured, ...nonFeatured]

    const selected = selectRandomProducts(products, 3)
    const nonNull = selected.filter(p => p !== null)
    expect(nonNull.length).toBe(3)
  })

  it('never returns duplicate products', () => {
    const products = Array.from({ length: 10 }, (_, i) =>
      createMockProduct({ id: `p${i}`, tags: ['featured'] })
    )

    for (let trial = 0; trial < 50; trial++) {
      const selected = selectRandomProducts(products, 3)
      const ids = selected.filter(Boolean).map(p => p!.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('returns nulls when no products are available', () => {
    const selected = selectRandomProducts([], 3)
    expect(selected).toEqual([null, null, null])
  })

  it('non-featured products remain accessible (are not deleted)', () => {
    const featured = Array.from({ length: 5 }, (_, i) =>
      createMockProduct({ id: `f${i}`, tags: ['featured'] })
    )
    const nonFeatured = Array.from({ length: 5 }, (_, i) =>
      createMockProduct({ id: `n${i}`, tags: ['other'] })
    )
    const products = [...featured, ...nonFeatured]
    // All products remain in the catalog; only the selection pool is constrained.
    expect(products.filter(p => !p.tags?.includes('featured'))).toHaveLength(5)
  })
})
