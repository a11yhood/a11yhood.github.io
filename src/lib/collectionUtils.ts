import { Product } from '@/lib/types'

type CollectionImageCandidate = Product & {
  featured?: boolean
}

type PickCollectionImageOptions = {
  usedProductKeys?: Set<string>
}

type CollectionImagePick = {
  imageUrl: string
  imageAlt?: string
  name: string
  productKey: string
}

/**
 * Picks the best representative image for a collection from its products.
 * Priority order:
 * 1) image alt text present
 * 2) product not already used by another collection image selection
 * 3) featured flag
 * 4) newest source update timestamp
 * 5) newest createdAt
 * 6) lexical key tie-breaker for deterministic output
 * Falls back to any product with an image if no preferred candidates exist.
 */
export function pickCollectionImage(
  products: Product[],
  options?: PickCollectionImageOptions,
): CollectionImagePick | undefined {
  const withImage = products.filter(p => p.imageUrl) as CollectionImageCandidate[]
  if (withImage.length === 0) return undefined

  const usedProductKeys = options?.usedProductKeys

  // Prefer products with alt text or that are featured
  const preferred = withImage.filter(p => p.imageAlt || p.featured)
  const pool = preferred.length > 0 ? preferred : withImage

  type WithUpdated = CollectionImageCandidate & { sourceLastUpdated?: number | string; source_last_updated?: number }
  const toTs = (v: number | string | undefined): number => {
    if (v === undefined || v === null) return 0
    const n = typeof v === 'string' ? Date.parse(v) : v
    return isNaN(n) ? 0 : n
  }

  const pick = [...pool].sort((a, b) => {
    const aHasAlt = a.imageAlt ? 1 : 0
    const bHasAlt = b.imageAlt ? 1 : 0
    if (aHasAlt !== bHasAlt) return bHasAlt - aHasAlt

    const aKey = a.slug || a.id || a.name
    const bKey = b.slug || b.id || b.name
    const aUnused = usedProductKeys?.has(aKey) ? 0 : 1
    const bUnused = usedProductKeys?.has(bKey) ? 0 : 1
    if (aUnused !== bUnused) return bUnused - aUnused

    const aFeatured = a.featured ? 1 : 0
    const bFeatured = b.featured ? 1 : 0
    if (aFeatured !== bFeatured) return bFeatured - aFeatured

    const aUpdated = toTs((a as WithUpdated).sourceLastUpdated ?? (a as WithUpdated).source_last_updated)
    const bUpdated = toTs((b as WithUpdated).sourceLastUpdated ?? (b as WithUpdated).source_last_updated)
    if (aUpdated !== bUpdated) return bUpdated - aUpdated

    if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt

    return aKey.localeCompare(bKey)
  })[0]

  const productKey = pick.slug || pick.id || pick.name
  return {
    imageUrl: pick.imageUrl!,
    imageAlt: pick.imageAlt,
    name: pick.name,
    productKey,
  }
}
