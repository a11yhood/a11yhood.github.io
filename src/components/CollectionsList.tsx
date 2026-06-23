import { useState, useMemo } from 'react'
import { AddToCollectionDefaults, Collection, Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Trash, Lock, LockOpen, Pencil, FolderOpen, Plus } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { pickCollectionImage } from '@/lib/collectionUtils'
import { getCollectionEntries, getCollectionProductEntries, resolveCollectionProducts } from '@/lib/collectionUtils'
import MarkdownText from '@/components/ui/MarkdownText'
import { buildAddToCollectionDefaultsForCollection } from '@/lib/addToCollection'

type CollectionsListProps = {
  collections: Collection[]
  products: Product[]
  onSelectCollection: (collection: Collection) => void
  onDeleteCollection: (collectionSlug: string) => void
  onEditCollection?: (collection: Collection) => void
  onOpenAddToCollection?: (defaults: AddToCollectionDefaults) => void
  currentUserId?: string
  currentUsername?: string
  isFirstLoadComplete?: boolean
}

export function CollectionsList({
  collections,
  products,
  onSelectCollection,
  onDeleteCollection,
  onEditCollection,
  onOpenAddToCollection,
  currentUserId,
  currentUsername,
  isFirstLoadComplete = true,
}: CollectionsListProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  // Compute a representative image for each collection once per data change.
  const collectionImages = useMemo(() => {
    const result: Record<string, ReturnType<typeof pickCollectionImage>> = {}
    const usedProductKeys = new Set<string>()

    collections.forEach(collection => {
      const collectionProducts = resolveCollectionProducts(collection, collections, products)
      const picked = pickCollectionImage(collectionProducts, { usedProductKeys })
      result[collection.id] = picked
      if (picked?.productKey) {
        usedProductKeys.add(picked.productKey)
      }
    })
    return result
  }, [collections, products])

  if (!collections || collections.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-muted-foreground">{isFirstLoadComplete ? 'No collections found' : 'Loading...'}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((collection) => {
        const collectionEntries = getCollectionEntries(collection)
        const productEntries = getCollectionProductEntries(collection)
        const isOwner = currentUserId === collection.userId
        const isEditorById = !!currentUserId && (collection.editorIds || []).includes(currentUserId)
        const isEditorByUsername = !!currentUsername && (collection.editorUsernames || []).includes(currentUsername)
        const isEditor = !isOwner && (isEditorById || isEditorByUsername)
        const canEdit = isOwner || isEditor
        const img = imageErrors[collection.id] ? undefined : collectionImages[collection.id]
        const collectionTargetId = collection.id || collection.slug
        
        return (
          <Card
            key={collection.id}
            className="hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
            onClick={(e) => {
              const target = e.target as HTMLElement | null
              if (target?.closest('button, a, input, select, textarea')) {
                return
              }
              onSelectCollection(collection)
            }}
            role="button"
            tabIndex={0}
            aria-label={`View collection: ${collection.name}`}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectCollection(collection)
              }
            }}
          >
            <div className="w-full h-40 bg-muted overflow-hidden flex items-center justify-center">
              {img ? (
                <img
                  src={img.imageUrl}
                  alt={img.imageAlt || `${img.name} image`}
                  className="w-full h-full object-cover object-center"
                  onError={() => setImageErrors(prev => ({ ...prev, [collection.id]: true }))}
                />
              ) : (
                <FolderOpen size={48} className="text-muted-foreground/30" aria-hidden="true" />
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <FolderOpen size={12} aria-hidden="true" />
                    Collection
                  </div>
                  <CardTitle as="h2" className="text-lg line-clamp-2">{collection.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {collection.isPublic ? (
                      <LockOpen size={14} className="text-muted-foreground" />
                    ) : (
                      <Lock size={14} className="text-muted-foreground" />
                    )}
                    <span>{collection.isPublic ? 'Public' : 'Private'}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {onOpenAddToCollection && collectionTargetId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 border-2 border-dashed border-foreground/60 text-foreground/80 hover:border-foreground hover:text-foreground hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenAddToCollection(buildAddToCollectionDefaultsForCollection(collection))
                      }}
                      aria-label={`Add ${collection.name} to a collection`}
                    >
                      <Plus size={16} />
                    </Button>
                  )}
                  {canEdit && (
                    <>
                    {onEditCollection && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditCollection(collection)
                        }}
                        aria-label="Edit collection"
                      >
                        <Pencil size={16} />
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteCollection(collection.slug || collection.id)
                        }}
                        aria-label="Delete collection"
                      >
                        <Trash size={16} />
                      </Button>
                    )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {collection.description && (
                <MarkdownText
                  text={collection.description}
                  className="text-sm text-muted-foreground mb-3 line-clamp-2"
                />
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isFirstLoadComplete
                    ? `${collectionEntries.length} ${collectionEntries.length === 1 ? 'item' : 'items'}${productEntries.length !== collectionEntries.length ? ` (${productEntries.length} products)` : ''}`
                    : 'Items: ?'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(collection.updatedAt, { addSuffix: true })}
                </span>
              </div>
              {!!collection.editorUsernames?.length && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Editors:{' '}
                  {collection.editorUsernames.map((username, index) => (
                    <span key={username}>
                      {index > 0 ? ', ' : ''}
                      <a
                        href={`/profile/${encodeURIComponent(username)}`}
                        className="underline underline-offset-2 hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{username}
                      </a>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
