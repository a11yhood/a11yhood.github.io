import { Collection, Product, Rating, UserAccount } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeft, Lock, LockOpen, Trash, Pencil } from '@phosphor-icons/react'
import { ProductCard } from '@/components/ProductCard'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { APIService } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { getProductsPathForTag } from '@/lib/tagRoutes'
import MarkdownText from '@/components/ui/MarkdownText'

type CollectionDetailProps = {
  collection: Collection
  ratings: Rating[]
  products?: Product[]
  onBack: () => void
  onRemoveProduct: (productSlug: string) => void
  onSelectProduct: (productSlug: string) => void
  isOwner: boolean
  userAccount?: UserAccount | null
  onDeleteProduct: (productSlug: string) => void
  onTogglePrivacy?: (nextPublic: boolean) => Promise<void> | void
  onDeleteCollection?: () => void
  onEditCollection?: () => void
}

export function CollectionDetail({
  collection,
  ratings,
  products: globalProducts,
  onBack,
  onRemoveProduct,
  onSelectProduct,
  isOwner,
  userAccount,
  onDeleteProduct,
  onTogglePrivacy,
  onDeleteCollection,
  onEditCollection,
}: CollectionDetailProps) {
  const navigate = useNavigate()
  const [collectionProducts, setCollectionProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Monotonically-increasing ID for the active load cycle. Incremented at the
  // start of each new load and again in the effect cleanup so that in-flight
  // callbacks from a superseded cycle can detect they are stale and bail out
  // before touching state.
  const loadIdRef = useRef(0)

  // Stable key derived from the sorted slug list so the effect only re-runs
  // when the actual set of slugs changes, not on every parent re-render that
  // creates a new array reference.
  const slugKey = useMemo(
    () => (collection.productSlugs ?? []).slice().sort().join(','),
    [collection.productSlugs]
  )

  // Derive top tags from the collection's products, sorted by frequency
  const topTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    collectionProducts.forEach(product => {
      product?.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)
  }, [collectionProducts])

  useEffect(() => {
    // Capture the ID for this load cycle.  Any async callback that resolves
    // after the cycle is superseded (slugKey/globalProducts changed, or the
    // component unmounted) will see loadIdRef.current !== loadId and bail out.
    loadIdRef.current++
    const loadId = loadIdRef.current

    const loadCollectionProducts = async () => {
      const slugs = collection.productSlugs || []
      if (slugs.length === 0) {
        setCollectionProducts([])
        return
      }

      setIsLoading(true)

      try {
        const cachedBySlug = new Map<string, Product>()
        ;(globalProducts || []).forEach((p) => {
          if (p?.slug) cachedBySlug.set(p.slug, p)
        })

        // Always render whatever we already have from global state first.
        const cachedProducts = slugs
          .map((slug) => cachedBySlug.get(slug))
          .filter((p): p is Product => p != null)

        if (loadIdRef.current === loadId) {
          setCollectionProducts(cachedProducts)
        }

        const missingSlugs = slugs.filter((slug) => !cachedBySlug.has(slug))

        if (missingSlugs.length === 0) {
          console.log('[CollectionDetail] Using cached global products, avoiding API calls')
          if (loadIdRef.current === loadId) {
            setIsLoading(false)
          }
          return
        }

        // Fetch only missing slugs and merge into existing products.
        console.log(`[CollectionDetail] Fetching ${missingSlugs.length} missing products individually`)

        await Promise.allSettled(
          missingSlugs.map(async (slug) => {
            try {
              const product = await APIService.getProduct(slug)
              // Bail out if this cycle was superseded before updating state
              if (loadIdRef.current !== loadId) return
              if (product != null) {
                // Merge while preserving collection slug order and avoiding holes.
                setCollectionProducts(prev => {
                  const bySlug = new Map<string, Product>()
                  prev.forEach((p) => {
                    if (p?.slug) bySlug.set(p.slug, p)
                  })
                  if (product.slug) bySlug.set(product.slug, product)

                  return slugs
                    .map((s) => bySlug.get(s))
                    .filter((p): p is Product => p != null)
                })
              }
            } catch (error) {
              console.error('[CollectionDetail] Error loading product:', slug, error)
            }
          })
        )

        // All fetches have settled — mark loading complete if still the active cycle
        if (loadIdRef.current === loadId) {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('[CollectionDetail] Error loading products:', error)
        if (loadIdRef.current === loadId) {
          setCollectionProducts([])
          setIsLoading(false)
        }
      }
    }

    loadCollectionProducts()

    return () => {
      // Invalidate this cycle: any still-running callbacks will check
      // loadIdRef.current and skip state updates.
      loadIdRef.current++
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey, globalProducts])

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
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && onEditCollection && (
                <Button variant="outline" size="sm" onClick={onEditCollection} aria-label="Edit collection">
                  <Pencil size={18} className="mr-2" />
                  Edit
                </Button>
              )}
              {isOwner && onDeleteCollection && (
                <Button variant="destructive" size="sm" onClick={onDeleteCollection} aria-label="Delete collection">
                  <Trash size={18} className="mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {collection.description && (
            <MarkdownText text={collection.description} className="text-muted-foreground mb-4" />
          )}
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {topTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created by:</span>{' '}
              <span className="font-medium">{collection.username}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Products:</span>{' '}
              <span className="font-medium">{collection.productSlugs?.length ?? collectionProducts.length}</span>
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

      {isLoading && collectionProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">Loading products...</p>
        </div>
      ) : !isLoading && collectionProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">This collection is empty</p>
          <p className="text-sm text-muted-foreground">
            {isOwner ? 'Add products from the product details page' : 'No products in this collection yet'}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-semibold mb-4">
            Products ({collectionProducts.length}{isLoading ? '…' : ''})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {collectionProducts.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard
                  product={product}
                  ratings={ratings}
                  onTagClick={(tag) => navigate(getProductsPathForTag(tag))}
                  onClick={() => onSelectProduct(product.slug)}
                  onDelete={onRemoveProduct}
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
