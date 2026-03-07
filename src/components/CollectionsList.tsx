import { Collection, Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash, Lock, LockOpen, Pencil } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import MarkdownText from '@/components/ui/MarkdownText'

type CollectionsListProps = {
  collections: Collection[]
  products: Product[]
  onSelectCollection: (collection: Collection) => void
  onDeleteCollection: (collectionSlug: string) => void
  onEditCollection?: (collection: Collection) => void
  currentUserId?: string
}

export function CollectionsList({
  collections,
  products,
  onSelectCollection,
  onDeleteCollection,
  onEditCollection,
  currentUserId,
}: CollectionsListProps) {
  const getProductsInCollection = (collection: Collection) => {
    return (products || []).filter(p => (collection.productSlugs || []).includes(p.slug))
  }

  const getTopTagsForCollection = (collectionProducts: Product[], limit = 5) => {
    const tagCounts = new Map<string, number>()
    collectionProducts.forEach(product => {
      product.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag)
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-muted-foreground">No collections found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((collection) => {
        const collectionProducts = getProductsInCollection(collection)
        const isOwner = currentUserId === collection.userId
        const topTags = getTopTagsForCollection(collectionProducts)
        
        return (
          <Card
            key={collection.id}
            className="hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
            onClick={() => onSelectCollection(collection)}
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
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-2">{collection.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {collection.isPublic ? (
                      <LockOpen size={14} className="text-muted-foreground" />
                    ) : (
                      <Lock size={14} className="text-muted-foreground" />
                    )}
                    <span>{collection.isPublic ? 'Public' : 'Private'}</span>
                  </CardDescription>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1">
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
                  </div>
                )}
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
                  {(collection.productSlugs || []).length} {(collection.productSlugs || []).length === 1 ? 'product' : 'products'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(collection.updatedAt, { addSuffix: true })}
                </span>
              </div>
              {collectionProducts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {collectionProducts.slice(0, 3).map((product) => (
                    <Badge key={product.id} variant="secondary" className="text-xs">
                      {product.name}
                    </Badge>
                  ))}
                  {collectionProducts.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{collectionProducts.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
              {topTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {topTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
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
