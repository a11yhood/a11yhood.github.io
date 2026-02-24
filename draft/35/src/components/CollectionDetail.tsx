import { Collection, Product, Rating, UserAccount } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeft, Lock, LockOpen, Trash, Share } from '@phosphor-icons/react'
import { ProductCard } from '@/components/ProductCard'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { APIService } from '@/lib/api'

type CollectionDetailProps = {
  collection: Collection
  ratings: Rating[]
  onBack: () => void
  onRemoveProduct: (productSlug: string) => void
  onSelectProduct: (productSlug: string) => void
  isOwner: boolean
  userAccount?: UserAccount | null
  onDeleteProduct: (productSlug: string) => void
  onTogglePrivacy?: (nextPublic: boolean) => Promise<void> | void
}

export function CollectionDetail({
  collection,
  ratings,
  onBack,
  onRemoveProduct,
  onSelectProduct,
  isOwner,
  userAccount,
  onDeleteProduct,
  onTogglePrivacy,
}: CollectionDetailProps) {
  const [collectionProducts, setCollectionProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadCollectionProducts = async () => {
      if (!collection.productSlugs || collection.productSlugs.length === 0) {
        setCollectionProducts([])
        return
      }

      setIsLoading(true)
      try {
        const products = await Promise.all(
          collection.productSlugs.map(slug => APIService.getProduct(slug))
        )
        setCollectionProducts(products.filter(p => p !== null))
      } catch (error) {
        console.error('[CollectionDetail] Error loading products:', error)
        setCollectionProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    loadCollectionProducts()
  }, [collection.productSlugs])

  const handleShare = () => {
    const url = `${window.location.origin}/collections/${collection.slug || collection.id}`
    navigator.clipboard.writeText(url)
    toast.success('Collection link copied to clipboard')
  }

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft size={18} className="mr-2" />
        Back to Collections
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{collection.name}</CardTitle>
              <div className="flex items-center gap-3">
                <CardDescription className="flex items-center gap-2">
                  {collection.isPublic ? (
                    <>
                      <LockOpen size={16} />
                      <span>Public Collection</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Private Collection</span>
                    </>
                  )}
                </CardDescription>
                {isOwner && (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => onTogglePrivacy?.(!collection.isPublic)}
                  >
                    {collection.isPublic ? 'Make Private' : 'Make Public'}
                  </Button>
                )}
              </div>
            </div>
            {collection.isPublic && (
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share size={18} className="mr-2" />
                Share
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {collection.description && (
            <p className="text-muted-foreground mb-4">{collection.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created by:</span>{' '}
              <span className="font-medium">{collection.userName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Products:</span>{' '}
              <span className="font-medium">{collectionProducts.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{' '}
              <span className="font-medium">
                {formatDistanceToNow(collection.updatedAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">Loading products...</p>
        </div>
      ) : collectionProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">This collection is empty</p>
          <p className="text-sm text-muted-foreground">
            {isOwner ? 'Add products from the product details page' : 'No products in this collection yet'}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-semibold mb-4">
            Products ({collectionProducts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {collectionProducts.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard
                  product={product}
                  ratings={ratings}
                  onClick={() => onSelectProduct(product.slug)}
                  onDelete={onDeleteProduct}
                  userAccount={userAccount}
                />
                {isOwner && (
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveProduct(product.slug)
                      }}
                      aria-label="Remove from collection"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
