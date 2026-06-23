import { AddToCollectionDefaults, Collection, CollectionEntry, Product } from '@/lib/types'
import { collectionContainsProduct } from '@/lib/collectionUtils'

function uniqueByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyFn(item)
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function normalizeCollectionEntries(entries: CollectionEntry[] = []): CollectionEntry[] {
  return entries
    .filter((entry): entry is CollectionEntry => !!entry && !!entry.kind)
    .map((entry, index) => ({
      ...entry,
      order: typeof entry.order === 'number' ? entry.order : index,
    }))
}

export function normalizeProductTargets(targets: string[] = []): string[] {
  return Array.from(
    new Set(
      targets
        .map((target) => String(target || '').trim())
        .filter(Boolean)
    )
  )
}

export function deriveRemovalProductTargets(
  entries: CollectionEntry[] = [],
  fallbackTargets: string[] = [],
): string[] {
  const fromEntries = entries
    .filter((entry) => entry.kind === 'product')
    .map((entry) => entry.targetSlug || entry.targetId || '')

  const normalizedEntries = normalizeProductTargets(fromEntries)
  if (normalizedEntries.length > 0) {
    return normalizedEntries
  }

  return normalizeProductTargets(fallbackTargets)
}

export function createProductEntriesForCollection(products: Pick<Product, 'id' | 'slug'>[]): CollectionEntry[] {
  return uniqueByKey(products, (product) => `${product.slug || ''}|${product.id || ''}`)
    .map((product, index) => {
      const targetSlug = typeof product.slug === 'string' ? product.slug.trim() : ''
      const targetId = typeof product.id === 'string' ? product.id.trim() : ''

      if (!targetSlug && !targetId) {
        return null
      }

      return {
        kind: 'product' as const,
        targetSlug: targetSlug || undefined,
        targetId: targetId || undefined,
        order: index,
      }
    })
    .filter((entry): entry is CollectionEntry => !!entry)
}

export function getPreselectedCollectionKeysForProducts(
  products: Pick<Product, 'id' | 'slug'>[],
  collections: Collection[] = [],
): string[] {
  const uniqueProducts = uniqueByKey(products, (product) => `${product.slug || ''}|${product.id || ''}`)

  if (uniqueProducts.length === 0) {
    return []
  }

  return collections
    .filter((collection) => {
      return uniqueProducts.every((product) => {
        const productKeys = [product.slug, product.id].filter(Boolean) as string[]
        return productKeys.some((key) => collectionContainsProduct(collection, key, collections))
      })
    })
    .map((collection) => collection.slug || collection.id)
    .filter(Boolean)
}

export function buildAddToCollectionDefaultsForProducts(
  products: Pick<Product, 'id' | 'slug'>[],
  collections: Collection[] = [],
  base?: Pick<AddToCollectionDefaults, 'name' | 'description' | 'isPublic'>,
): AddToCollectionDefaults {
  return buildAddToCollectionDefaults({
    name: base?.name,
    description: base?.description,
    isPublic: base?.isPublic,
    entries: createProductEntriesForCollection(products),
    preselectedCollectionKeys: getPreselectedCollectionKeysForProducts(products, collections),
  })
}

export function createCollectionEntryForCollection(
  collection: Pick<Collection, 'id' | 'slug' | 'name' | 'description'>,
): CollectionEntry | null {
  const targetId = (collection.id || collection.slug || '').trim()
  if (!targetId) {
    return null
  }

  return {
    kind: 'collection',
    targetId,
    targetSlug: collection.slug,
    title: collection.name,
    description: collection.description,
    order: 0,
  }
}

export function buildAddToCollectionDefaults(defaults: AddToCollectionDefaults): AddToCollectionDefaults {
  return {
    name: defaults.name,
    description: defaults.description,
    isPublic: defaults.isPublic,
    entries: normalizeCollectionEntries(defaults.entries),
    preselectedCollectionKeys: Array.from(new Set((defaults.preselectedCollectionKeys || []).filter(Boolean))),
  }
}

export function buildAddToCollectionDefaultsForCollection(
  collection: Pick<Collection, 'id' | 'slug' | 'name' | 'description'>,
  base?: Pick<AddToCollectionDefaults, 'name' | 'description' | 'isPublic'>,
): AddToCollectionDefaults {
  const entry = createCollectionEntryForCollection(collection)

  return buildAddToCollectionDefaults({
    name: base?.name ?? `From Collection: ${collection.name}`,
    description: base?.description ?? `Collection entry for ${collection.name}`,
    isPublic: base?.isPublic ?? false,
    entries: entry ? [entry] : [],
    preselectedCollectionKeys: [],
  })
}
