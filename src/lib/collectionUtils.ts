import { Collection, CollectionEntry, CollectionEntryKind, Product } from '@/lib/types'

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

export function isCollectionEntryKind(kind: string): kind is CollectionEntryKind {
  return kind === 'product' || kind === 'collection' || kind === 'blogPost' || kind === 'query'
}

export function isCollectionEntry(entry: CollectionEntry | undefined): entry is CollectionEntry {
  return !!entry && isCollectionEntryKind(entry.kind)
}

export function createCollectionEntriesFromProductSlugs(productSlugs: string[] = []): CollectionEntry[] {
  return productSlugs.filter(Boolean).map((slug, index) => ({
    kind: 'product',
    targetSlug: slug,
    order: index,
  }))
}

export function createCollectionEntriesFromProductIds(productIds: string[] = []): CollectionEntry[] {
  return productIds.filter(Boolean).map((id, index) => ({
    kind: 'product',
    targetId: id,
    order: index,
  }))
}

function hydrateCollectionEntry(entry: CollectionEntry, fallbackProductSlugs: string[], fallbackProductIds: string[], fallbackCursor: { value: number }): CollectionEntry {
  if (entry.kind === 'product') {
    if (entry.targetSlug || entry.targetId) {
      return entry
    }

    const targetId = (entry as CollectionEntry & { productId?: string }).productId
    if (targetId) {
      return {
        ...entry,
        targetId,
      }
    }

    const candidateIndex = typeof entry.order === 'number' ? entry.order : fallbackCursor.value
    const targetSlug = fallbackProductSlugs[candidateIndex] || fallbackProductSlugs[fallbackCursor.value]
    const fallbackTargetId = fallbackProductIds[candidateIndex] || fallbackProductIds[fallbackCursor.value]

    fallbackCursor.value += 1

    if (!targetSlug && !fallbackTargetId) {
      return entry
    }

    return {
      ...entry,
      targetSlug: entry.targetSlug || targetSlug,
      targetId: entry.targetId || fallbackTargetId,
    }
  }

  if (entry.kind === 'collection') {
    if (entry.targetId) {
      return entry
    }

    const targetId = (entry as CollectionEntry & { collectionId?: string }).collectionId
    if (!targetId) {
      return entry
    }

    return {
      ...entry,
      targetId,
    }
  }

  if (entry.kind === 'blogPost') {
    if (entry.targetId) {
      return entry
    }

    const targetId = (entry as CollectionEntry & { blogPostId?: string }).blogPostId
    if (!targetId) {
      return entry
    }

    return {
      ...entry,
      targetId,
    }
  }

  return entry
}

export function collectionContainsCollection(
  collection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs' | 'slug' | 'id'>,
  collectionId: string,
  allCollections: Collection[] = [],
  seen: Set<string> = new Set(),
): boolean {
  const collectionKey = collection.slug || collection.id
  if (collectionKey && seen.has(collectionKey)) {
    return false
  }

  const nextSeen = new Set(seen)
  if (collectionKey) {
    nextSeen.add(collectionKey)
  }

  return getCollectionEntries(collection).some((entry) => {
    if (entry.kind !== 'collection') {
      return false
    }

    const targetKey = entry.targetId || entry.targetSlug
    if (!targetKey) {
      return false
    }

    if (targetKey === collectionId) {
      return true
    }

    const childCollection = allCollections.find((candidate) => candidate.slug === targetKey || candidate.id === targetKey)
    if (!childCollection) {
      return false
    }

    return collectionContainsCollection(childCollection, collectionId, allCollections, nextSeen)
  })
}

export function getCollectionEntries(collection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs'>): CollectionEntry[] {
  if (Array.isArray(collection.entries) && collection.entries.length > 0) {
    const entries = collection.entries.filter(isCollectionEntry)

    const fallbackProductSlugs = Array.isArray(collection.productSlugs)
      ? collection.productSlugs.filter(Boolean)
      : []
    const fallbackProductIds = Array.isArray(collection.productIds)
      ? collection.productIds.filter(Boolean)
      : []

    // Some backend payloads include backend-specific identifier fields and omit
    // the app's targetId/targetSlug shape. Hydrate all supported entry kinds so
    // resolution and reserialization operate on stable internal fields.
    const fallbackCursor = { value: 0 }
    const hydratedEntries = entries.map((entry) => hydrateCollectionEntry(entry, fallbackProductSlugs, fallbackProductIds, fallbackCursor))

    // Backends that track products in productSlugs/productIds separately from non-product
    // entries may not include every product in the entries array. Append any products from
    // the fallback arrays that aren't already represented in the hydrated entries.
    const coveredProductKeys = new Set<string>()
    hydratedEntries.forEach((entry) => {
      if (entry.kind === 'product') {
        if (entry.targetId) coveredProductKeys.add(entry.targetId)
        if (entry.targetSlug) coveredProductKeys.add(entry.targetSlug)
      }
    })

    const extraProductEntries: CollectionEntry[] = []
    const baseOrder = hydratedEntries.length
    const maxLen = Math.max(fallbackProductSlugs.length, fallbackProductIds.length)
    for (let i = 0; i < maxLen; i++) {
      const slug = fallbackProductSlugs[i]
      const id = fallbackProductIds[i]
      const alreadyCovered = (slug && coveredProductKeys.has(slug)) || (id && coveredProductKeys.has(id))
      if (!alreadyCovered && (slug || id)) {
        extraProductEntries.push({
          kind: 'product',
          targetSlug: slug || undefined,
          targetId: id || undefined,
          order: baseOrder + extraProductEntries.length,
        })
        if (slug) coveredProductKeys.add(slug)
        if (id) coveredProductKeys.add(id)
      }
    }

    return extraProductEntries.length === 0 ? hydratedEntries : [...hydratedEntries, ...extraProductEntries]
  }

  if (Array.isArray(collection.productSlugs) && collection.productSlugs.length > 0) {
    return createCollectionEntriesFromProductSlugs(collection.productSlugs)
  }

  if (Array.isArray(collection.productIds) && collection.productIds.length > 0) {
    return collection.productIds.filter(Boolean).map((id, index) => ({
      kind: 'product',
      targetId: id,
      order: index,
    }))
  }

  return []
}

export function getCollectionProductEntries(collection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs'>): CollectionEntry[] {
  return getCollectionEntries(collection).filter((entry) => entry.kind === 'product')
}

export function getCollectionProductSlugs(collection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs'>): string[] {
  if (Array.isArray(collection.productSlugs) && collection.productSlugs.length > 0) {
    return collection.productSlugs.filter(Boolean)
  }

  return getCollectionProductEntries(collection)
    .map((entry) => entry.targetSlug || entry.targetId || '')
    .filter(Boolean)
}

export function collectionEntryKey(entry: CollectionEntry, index: number): string {
  return `${entry.kind}:${entry.targetSlug || entry.targetId || entry.title || index}`
}

const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i

export function getCollectionEntryProductCandidates(entry: Pick<CollectionEntry, 'targetSlug' | 'targetId'>): string[] {
  const baseKeys = [entry.targetSlug, entry.targetId].filter(Boolean) as string[]
  if (baseKeys.length === 0) {
    return []
  }

  const candidates = new Set<string>()
  baseKeys.forEach((baseKey) => {
    candidates.add(baseKey)
    const uuidMatch = baseKey.match(UUID_RE)
    if (uuidMatch?.[1]) {
      candidates.add(uuidMatch[1])
    }
  })

  return Array.from(candidates)
}

export function collectionContainsProduct(
  collection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs' | 'slug' | 'id'>,
  productSlug: string,
  allCollections: Collection[] = [],
  seen: Set<string> = new Set(),
): boolean {
  const collectionKey = collection.slug || collection.id
  if (collectionKey && seen.has(collectionKey)) {
    return false
  }

  const nextSeen = new Set(seen)
  if (collectionKey) {
    nextSeen.add(collectionKey)
  }

  return getCollectionEntries(collection).some((entry) => {
    if (entry.kind === 'product') {
      return getCollectionEntryProductCandidates(entry).includes(productSlug)
    }

    if (entry.kind !== 'collection') {
      return false
    }

    const childKey = entry.targetSlug || entry.targetId
    if (!childKey) {
      return false
    }

    const childCollection = allCollections.find((candidate) => candidate.slug === childKey || candidate.id === childKey)
    if (!childCollection) {
      return false
    }

    return collectionContainsProduct(childCollection, productSlug, allCollections, nextSeen)
  })
}

export function collectionContainsAllProducts(
  collection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs' | 'slug' | 'id'>,
  productSlugs: string[],
  allCollections: Collection[] = [],
): boolean {
  return productSlugs.filter(Boolean).every((slug) => collectionContainsProduct(collection, slug, allCollections))
}

export function resolveCollectionProducts(
  collection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs' | 'slug' | 'id'>,
  allCollections: Collection[] = [],
  allProducts: Product[] = [],
  seenCollections: Set<string> = new Set(),
): Product[] {
  const productsBySlug = new Map<string, Product>()
  const productsById = new Map<string, Product>()
  allProducts.forEach((product) => {
    if (product.slug) productsBySlug.set(product.slug, product)
    if (product.id) productsById.set(product.id, product)
  })

  const resolved: Product[] = []
  const seenProducts = new Set<string>()

  const walk = (
    currentCollection: Pick<Collection, 'entries' | 'productIds' | 'productSlugs' | 'slug' | 'id'>,
    visitingCollections: Set<string>,
  ) => {
    const currentKey = currentCollection.slug || currentCollection.id
    if (currentKey && visitingCollections.has(currentKey)) {
      return
    }

    const nextVisiting = new Set(visitingCollections)
    if (currentKey) {
      nextVisiting.add(currentKey)
    }

    getCollectionEntries(currentCollection).forEach((entry) => {
      if (entry.kind === 'product') {
        const candidates = getCollectionEntryProductCandidates(entry)
        const key = candidates[0] || ''
        const product = candidates
          .map((candidate) => productsBySlug.get(candidate) || productsById.get(candidate))
          .find((candidate): candidate is Product => !!candidate)
        const productKey = product?.slug || product?.id || key
        if (product && productKey && !seenProducts.has(productKey)) {
          seenProducts.add(productKey)
          resolved.push(product)
        }
        return
      }

      if (entry.kind !== 'collection') {
        return
      }

      const childKey = entry.targetSlug || entry.targetId
      if (!childKey) {
        return
      }

      const childCollection = allCollections.find((candidate) => candidate.slug === childKey || candidate.id === childKey)
      if (!childCollection) {
        return
      }

      walk(childCollection, nextVisiting)
    })
  }

  walk(collection, seenCollections)

  return resolved
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
