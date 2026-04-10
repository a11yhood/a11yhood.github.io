import { Collection, Product, Rating, UserAccount } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeft, Lock, LockOpen, Trash, Pencil } from '@phosphor-icons/react'
import { ProductCard } from '@/components/ProductCard'
import { ProductFilterTag } from '@/components/ProductFilterTag'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { APIService } from '@/lib/api'
import { Link, useNavigate } from 'react-router-dom'
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
  const [isLoading, setIsLoading] = useState(false)

  // Products individually fetched by this component (not present in globalProducts).
  // Stored in a ref so mutations don't trigger re-renders; `fetchVersion` is bumped
  // to tell the collectionProducts memo to recompute after a fetch completes.
  const fetchedBySlugRef = useRef<Map<string, Product>>(new Map())
  const [fetchVersion, setFetchVersion] = useState(0)

  // Stable ref to globalProducts — lets the fetch effect read the latest value
  // without declaring it as a dependency (which would restart fetches on every
  // unrelated global-products update).
  const globalProductsRef = useRef(globalProducts)
  useEffect(() => { globalProductsRef.current = globalProducts }, [globalProducts])

  // Stable key derived from the sorted slug list so the fetch effect only re-runs
  // when the actual set of slugs changes, not on every parent re-render that
  // creates a new array reference.
  const slugKey = useMemo(
    () => (collection.productSlugs ?? []).slice().sort().join(','),
    [collection.productSlugs]
  )

  // Fetch effect: runs only when the slug set changes.
  // globalProducts changes do NOT restart this effect; the collectionProducts
  // memo below handles syncing those updates without touching the network.
  useEffect(() => {
    // New slug set — wipe any products fetched for the previous collection.
    fetchedBySlugRef.current = new Map()
    setFetchVersion(0)

    const slugs = collection.productSlugs || []
    if (slugs.length === 0) {
      setIsLoading(false)
      return
    }

    // Snapshot global products at the start of this cycle.  Slugs already
    // present here don't need a network call.
    const globalBySlug = new Map<string, Product>()
    ;(globalProductsRef.current || []).forEach((p) => {
      if (p?.slug) globalBySlug.set(p.slug, p)
    })

    const missingSlugs = slugs.filter((slug) => !globalBySlug.has(slug))
    if (missingSlugs.length === 0) {
      console.log('[CollectionDetail] All products already cached, skipping API calls')
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    console.log(`[CollectionDetail] Fetching ${missingSlugs.length} missing products`)

    Promise.allSettled(
      missingSlugs.map((slug) => APIService.getProduct(slug))
    ).then((results) => {
      if (cancelled) return
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value != null) {
          fetchedBySlugRef.current.set(missingSlugs[i], result.value)
        } else if (result.status === 'rejected') {
          console.error('[CollectionDetail] Error loading product:', missingSlugs[i], result.reason)
        }
      })
      setFetchVersion((v) => v + 1)
      setIsLoading(false)
    }).catch((err) => {
      if (!cancelled) {
        console.error('[CollectionDetail] Unexpected error fetching products:', err)
        setIsLoading(false)
      }
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey]) // intentionally excludes globalProducts — read via globalProductsRef

  // Merge globalProducts (always fresh, takes precedence) with locally-fetched
  // fallbacks to produce the ordered list for rendering.  Recomputes whenever
  // the slug set, global cache, or locally-fetched set changes — without issuing
  // any network requests.
  const collectionProducts = useMemo(() => {
    const slugs = collection.productSlugs || []
    if (slugs.length === 0) return []
    const bySlug = new Map<string, Product>()
    // Locally-fetched products (lower priority — may be slightly stale)
    fetchedBySlugRef.current.forEach((p, slug) => bySlug.set(slug, p))
    // Global products are always fresh and take precedence
    ;(globalProducts || []).forEach((p) => { if (p?.slug) bySlug.set(p.slug, p) })
    return slugs.map((s) => bySlug.get(s)).filter((p): p is Product => p != null)
  // fetchVersion triggers recomputation when fetchedBySlugRef is mutated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey, globalProducts, fetchVersion])

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
            <ul className="flex flex-wrap gap-2 mb-4">
              {topTags.map((tag) => (
                <li key={tag}>
                  <ProductFilterTag
                    tag={tag}
                    selected={false}
                    onTagClick={(clickedTag) => navigate(getProductsPathForTag(clickedTag))}
                    variant="card"
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created by:</span>{' '}
              <Link
                to={`/profile/${collection.username}`}
                className="font-medium hover:underline"
              >
                {collection.username}
              </Link>
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
