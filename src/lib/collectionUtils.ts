import { Product } from '@/lib/types'

/**
 * Picks the best representative image for a collection from its products.
 * Prefers products that have alt text or are featured (accessibility / quality
 * signal), then picks randomly among equally-ranked candidates.
 * Falls back to any product with an image if no preferred candidates exist.
 */
export function pickCollectionImage(products: Product[]): { imageUrl: string; imageAlt?: string; name: string } | undefined {
  const withImage = products.filter(p => p.imageUrl)
  if (withImage.length === 0) return undefined

  // Prefer products with alt text or that are featured
  const preferred = withImage.filter(p => p.imageAlt || p.featured)
  const pool = preferred.length > 0 ? preferred : withImage

  const pick = pool[Math.floor(Math.random() * pool.length)]
  return { imageUrl: pick.imageUrl!, imageAlt: pick.imageAlt, name: pick.name }
}
