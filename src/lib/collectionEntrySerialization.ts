import type { CollectionEntry } from '@/lib/types'

export function serializeCollectionEntryForUpdate(entry: CollectionEntry) {
  const base = {
    kind: entry.kind,
  } as Record<string, unknown>

  if (entry.kind === 'collection') {
    if (entry.targetId) {
      base.collectionId = entry.targetId
    } else if (entry.targetSlug) {
      base.collectionId = entry.targetSlug
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  if (entry.kind === 'product') {
    const productId = entry.targetId || entry.targetSlug
    if (productId) {
      base.productId = productId
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  if (entry.kind === 'blogPost') {
    const blogPostId = entry.targetId || entry.targetSlug
    if (blogPostId) {
      base.blogPostId = blogPostId
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  if (entry.kind === 'query') {
    if (entry.query) {
      base.query = entry.query
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  return base
}

export function serializeCollectionEntryForCreate(entry: CollectionEntry) {
  const base = {
    kind: entry.kind,
  } as Record<string, unknown>

  const legacyEntry = entry as CollectionEntry & {
    collectionId?: string
    productId?: string
    blogPostId?: string
    collection?: { collection_id?: string }
    product?: { product_id?: string }
    blog_post?: { blog_post_id?: string }
  }

  if (entry.kind === 'collection') {
    const collectionId =
      entry.targetId ||
      entry.targetSlug ||
      legacyEntry.collectionId ||
      legacyEntry.collection?.collection_id
    if (collectionId) {
      base.collection_id = collectionId
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  if (entry.kind === 'product') {
    const productId =
      entry.targetId ||
      entry.targetSlug ||
      legacyEntry.productId ||
      legacyEntry.product?.product_id
    if (productId) {
      base.product_id = productId
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  if (entry.kind === 'blogPost') {
    const blogPostId =
      entry.targetId ||
      entry.targetSlug ||
      legacyEntry.blogPostId ||
      legacyEntry.blog_post?.blog_post_id
    if (blogPostId) {
      base.blog_post_id = blogPostId
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  if (entry.kind === 'query') {
    if (entry.query) {
      base.query = entry.query
    }

    if (entry.title) {
      base.label = entry.title
    }

    if (typeof entry.order === 'number') {
      base.position = entry.order
    }

    return base
  }

  return base
}