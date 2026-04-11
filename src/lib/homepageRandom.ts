/**
 * Shared logic for the homepage "Random Products" feed.
 *
 * Only products tagged with FEATURED_TAG are eligible for the homepage feed.
 * When fewer than `count` featured products exist the full catalog is used as a
 * fallback so the slots are never left permanently empty.
 */

import type { Product } from '@/lib/types'

/** Tag that marks a product as eligible for the homepage random feed. */
export const FEATURED_TAG = 'featured'

/**
 * Pick `count` unique products at random from `pool` using a Fisher-Yates shuffle.
 * Returns as many items as are available when `pool.length < count`.
 */
export function pickUniqueRandom(pool: Product[], count: number): Product[] {
  if (pool.length === 0) return []
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

/**
 * Select `count` unique random products from the featured pool.
 *
 * If fewer than `count` products carry the FEATURED_TAG the full catalog is
 * used so that slots are still filled.  Returns an array of exactly `count`
 * entries; missing slots are `null`.
 */
export function selectFeaturedRandomProducts(
  products: Product[],
  count: number
): (Product | null)[] {
  const featuredPool = products.filter(p => p.tags?.includes(FEATURED_TAG))
  const pool = featuredPool.length >= count ? featuredPool : products
  const picked = pickUniqueRandom(pool, count)
  return Array.from({ length: count }, (_, i) => picked[i] ?? null)
}
