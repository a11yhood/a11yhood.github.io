import { useState, useEffect, useRef, useCallback } from 'react'
import { Link as LinkIcon, Trash, Prohibit, CheckCircle, Star } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StarRating } from './StarRating'
import { DiscussionSection } from './DiscussionSection'
import { TagManager } from './TagManager'
import { CollectionsManager } from './CollectionsManager'
import { ProductEditDialog } from './ProductEditDialog'
import { AddToCollectionDialog } from './AddToCollectionDialog'
import { CreateCollectionDialog } from './CreateCollectionDialog'
import { ProductEditors } from './ProductEditors'
import { CollapsibleCard } from './CollapsibleCard'
import { Product, ProductUpdate, Rating, Discussion, UserData, Collection, CollectionCreateInput, UserAccount } from '@/lib/types'
import { APIService, resolveApiImageUrl } from '@/lib/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatSourceLabel, getSourceIcon, calculateAverageRating, getCanonicalHost, formatRelativeTime } from '@/lib/utils'
import MarkdownText from '@/components/ui/MarkdownText'

type ProductDetailProps = {
  product: Product
  ratings: Rating[]
  discussions: Discussion[]
  user: UserData | null
  userAccount?: UserAccount | null
  userCollections?: Collection[]
  onBack: () => void
  onRate: (rating: number) => void
  onDiscuss: (content: string, parentId?: string) => void
  onAddTag: (tag: string) => void | Promise<void>
  onAddToCollection?: (collectionSlug: string) => void
  onRemoveFromCollection?: (collectionSlug: string) => void
  onCreateCollection?: (collection: CollectionCreateInput) => void
  allTags: string[]
  allProductTypes?: string[]
  onDelete?: (productId: string) => void
  onEdit?: (updatedProduct: ProductUpdate) => void
  onToggleBan?: (product: Product, reason?: string) => void
  onEditDiscussion?: (id: string, content: string) => void
  onDeleteDiscussion?: (id: string) => void
  onToggleBlockDiscussion?: (id: string, block: boolean) => void
  onRequireLogin?: (returnToPath: string) => void
  autoOpenEdit?: boolean
  autoOpenOwnershipRequest?: boolean
}

export function ProductDetail({
  product,
  ratings,
  discussions,
  user,
  userAccount,
  userCollections = [],
  onBack,
  onRate,
  onDiscuss,
  onAddTag,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateCollection,
  allTags,
  allProductTypes = [],
  onDelete,
  onEdit,
  onToggleBan,
  onEditDiscussion,
  onDeleteDiscussion,
  onToggleBlockDiscussion,
  onRequireLogin,
  autoOpenEdit,
  autoOpenOwnershipRequest,
}: ProductDetailProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLooksInvisible, setImageLooksInvisible] = useState(false)
  const [localCollections, setLocalCollections] = useState<Collection[]>(userCollections)
  const collectionLoadStartedRef = useRef(false)
  const resolvedImageUrl = (() => {
    if (product.imageUrl) {
      return product.imageUrl
    }

    const imageId = typeof product.imageId === 'string' ? product.imageId.trim() : ''
    if (imageId) {
      return resolveApiImageUrl(`/api/images/${encodeURIComponent(imageId)}`)
    }

    return undefined
  })()
  const shouldShowImage = !!resolvedImageUrl && !imageError
  const canModerate = userAccount?.role === 'admin' || userAccount?.role === 'moderator'
  const isOwner = !!userAccount?.id && (product.createdBy === userAccount.id || product.submittedBy === userAccount.id)
  const isEditor = !!userAccount?.id && (product.editorIds?.includes(userAccount.id) || false)
  const canEditProduct = isOwner || isEditor
  const handleRequireLogin = () => {
    if (!onRequireLogin || typeof window === 'undefined') return

    const rawPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const basePathRaw = import.meta.env.BASE_URL || '/'
    const basePath = (() => {
      const withLeadingSlash = basePathRaw.startsWith('/') ? basePathRaw : `/${basePathRaw}`
      return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
    })()
    const basePathNoTrailingSlash = basePath === '/' ? '/' : basePath.slice(0, -1)

    const normalizedReturnPath = (() => {
      if (basePathNoTrailingSlash === '/') {
        return rawPath
      }
      if (rawPath === basePathNoTrailingSlash) {
        return '/'
      }
      if (rawPath.startsWith(`${basePathNoTrailingSlash}/`)) {
        return rawPath.slice(basePathNoTrailingSlash.length) || '/'
      }
      return rawPath
    })()

    onRequireLogin(normalizedReturnPath)
  }
  const [showAddToCollectionDialog, setShowAddToCollectionDialog] = useState(false)
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] = useState(false)
  const prevShowAddToCollectionDialogRef = useRef(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banReason, setBanReason] = useState('')

  // Load collections function (extracted for reuse)
  const loadCollections = useCallback(async () => {
    if (!user) return
    try {
      const userCollections = await APIService.getUserCollections()
      setLocalCollections(userCollections)
      collectionLoadStartedRef.current = true
    } catch (error) {
      // Silently handle errors - collections are optional
      console.debug('Failed to load collections:', error)
    }
  }, [user])

  // Load collections on mount and whenever user state changes
  useEffect(() => {
    collectionLoadStartedRef.current = false
    void loadCollections()
  }, [loadCollections, user])

  useEffect(() => {
    if (user) {
      if (showAddToCollectionDialog && !prevShowAddToCollectionDialogRef.current) {
        void loadCollections()
      } else if (!showAddToCollectionDialog && prevShowAddToCollectionDialogRef.current) {
        void loadCollections()
      }
    }
    prevShowAddToCollectionDialogRef.current = showAddToCollectionDialog
  }, [showAddToCollectionDialog, user, loadCollections])

  useEffect(() => {
    setImageError(false)
    setImageLooksInvisible(false)
  }, [resolvedImageUrl])

  console.log('[ProductDetail] Filtering ratings:', {
    productId: product.id,
    totalRatings: ratings.length,
    ratingsProductIds: ratings.map(r => ({ productId: r.productId, userId: r.userId })),
  })
  const productRatings = ratings.filter((r) => r.productId === product.id)
  console.log('[ProductDetail] Filtered ratings:', {
    productRatingsCount: productRatings.length,
    productRatings: productRatings.map(r => ({ productId: r.productId, userId: r.userId, rating: r.rating })),
  })
  const averageRating = calculateAverageRating(product.sourceRating, productRatings, product.id)
  const userRating = user ? productRatings.find((r) => r.userId === user.id)?.rating || 0 : 0

  const productDiscussions = discussions.filter((d) => d.productId === product.id)
  const canSeeDiscussion = (d: Discussion) => {
    if (!d.blocked) return true
    if (canModerate) return true
    return !!user && d.userId === user.id
  }
  const visibleProductDiscussions = productDiscussions.filter(canSeeDiscussion)

  const hasUserRatings = productRatings.length > 0
  const hasSourceRatings = typeof product.sourceRatingCount === 'number' && product.sourceRatingCount > 0
  const ratingSummary = hasUserRatings
    ? `${productRatings.length} user${productRatings.length === 1 ? '' : 's'} rated`
    : hasSourceRatings
      ? `${product.sourceRatingCount} ${product.sourceRatingCount === 1 ? 'rating' : 'ratings'} on ${formatSourceLabel(product.source) || product.source}`
      : 'No ratings yet'

  const handleDelete = () => {
    const targetId = product.slug || product.id
    if (onDelete && targetId) {
      onDelete(targetId)
      onBack()
    }
  }

  const handleToggleBan = () => {
    console.log('[ProductDetail] Toggle ban click', {
      hasHandler: !!onToggleBan,
      banned: product.banned,
      slug: product.slug,
      id: product.id,
      canModerate,
      isEditor
    })
    if (!onToggleBan) return

    if (product.banned) {
      onToggleBan(product)
      return
    }

    setBanReason(product.bannedReason || '')
    setBanDialogOpen(true)
  }

  const handleConfirmBan = () => {
    if (!onToggleBan) return
    onToggleBan(product, banReason.trim() || undefined)
    setBanDialogOpen(false)
    setBanReason('')
  }

  const updatedTs = product.source_last_updated ?? product.sourceLastUpdated
  const updatedText = updatedTs ? formatRelativeTime(updatedTs) : ''

  const sourceIcon = getSourceIcon(product.source)
  const sourceLabel = formatSourceLabel(product.source)
  const sourceHost = getCanonicalHost(product.sourceUrl) || sourceLabel

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4 sm:mb-6 sm:flex-nowrap">
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (canModerate || canEditProduct) && (
            <>
              {onEdit && !product.banned && (
                <ProductEditDialog
                  product={product}
                  onSave={onEdit}
                  userAccount={userAccount}
                  autoOpen={autoOpenEdit}
                  allProductTypes={allProductTypes}
                />
              )}
              {canModerate && onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 shadow-sm border border-destructive/70 text-destructive-foreground"
                  aria-label="Delete product"
                >
                  <Trash size={18} />
                  <span className="hidden sm:inline">Delete Product</span>
                </Button>
              )}
              {canModerate && onToggleBan && (
                <Button
                  variant={product.banned ? 'secondary' : 'outline'}
                  onClick={handleToggleBan}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                  aria-label={product.banned ? 'Unban product' : 'Ban product'}
                >
                  {product.banned ? <CheckCircle size={18} /> : <Prohibit size={18} />}
                  <span className="hidden sm:inline">{product.banned ? 'Unban' : 'Ban'} Product</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {product.banned && (
        <Card className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2">
              <Prohibit size={20} className="text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">This product is banned from updates</p>
                <p className="text-sm text-muted-foreground">
                  {product.bannedReason ? product.bannedReason : 'No reason provided.'}
                  {product.bannedAt && (
                    <span className="ml-2">(since {new Date(product.bannedAt).toLocaleDateString()})</span>
                  )}
                </p>
              </div>
            </div>
            {canModerate && onToggleBan && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleToggleBan}
                aria-label="Unban product"
              >
                <CheckCircle size={16} className="mr-1" />
                Unban
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <div className="mb-6">
            {shouldShowImage ? (
              <div className="float-left mr-4 mb-3 sm:mr-6 sm:mb-4 max-w-[300px] w-full">
                <img
                  src={resolvedImageUrl}
                  alt={product.imageAlt || `${product.name} product image`}
                  className="rounded-lg w-full h-auto"
                  onLoad={(event) => {
                    const target = event.currentTarget
                    // Tiny assets (e.g. 1x1 transparent PNGs) render as "nothing" to users.
                    setImageLooksInvisible(target.naturalWidth <= 2 && target.naturalHeight <= 2)
                  }}
                  onError={() => setImageError(true)}
                />
                {imageLooksInvisible && (
                  <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
                    Image loaded, but the file is very small and may look blank.
                  </p>
                )}
              </div>
            ) : (
              <div className="float-left mr-4 mb-3 sm:mr-6 sm:mb-4 rounded-lg max-w-[300px] w-full h-auto min-h-[180px] bg-muted text-muted-foreground flex items-center justify-center text-sm">
                <span>Image unavailable for {product.name}</span>
              </div>
            )}

            <div className="flex items-start justify-between gap-3 sm:gap-4 mb-2 sm:mb-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight line-clamp-2 sm:line-clamp-none">
                {product.name}
              </h1>
              <div className="flex items-center gap-2">
                {product.banned && <Badge variant="destructive">Banned</Badge>}
                <Badge className="shrink-0">{product.type}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4" aria-label="Average rating summary">
              <span className="text-base font-medium text-foreground">{averageRating.toFixed(1)}</span>
              <Star size={22} weight="fill" className="text-accent" aria-hidden="true" />
              {!hasUserRatings && !hasSourceRatings ? (
                <span className="text-sm text-muted-foreground">(No ratings yet)</span>
              ) : (
                <span className="text-sm text-muted-foreground">({ratingSummary})</span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                {sourceIcon && <FontAwesomeIcon icon={sourceIcon} className="w-4 h-4" />}
                View on {sourceHost}
                <LinkIcon size={14} />
              </a>
            </div>

            <MarkdownText
              text={product.description}
              className="text-base leading-relaxed text-foreground prose prose-sm max-w-none line-clamp-2 sm:line-clamp-none"
            />

            {updatedText && (
              <p className="mt-3 text-sm text-muted-foreground">Last updated {updatedText}</p>
            )}

            <div className="clear-both" />
          </div>

          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">{user ? 'Your Rating' : 'Rating'}</h2>
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <StarRating value={userRating} onChange={onRate} size={24} className="shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  Rate this product
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={handleRequireLogin}
                  className="hover:opacity-80 transition-opacity"
                  aria-label="Sign in to rate this product"
                >
                  <StarRating value={averageRating} readonly size={24} className="shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleRequireLogin}
                  className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hover:underline"
                  aria-label="Sign in to rate this product"
                >
                  Rate this product
                </button>
              </div>
            )}
          </div>

          <div className="mb-6 sm:mb-8">
            <TagManager
              productId={product.id}
              currentTags={product.tags}
              allTags={allTags}
              onAddTag={onAddTag}
              user={user}
              onRequireLogin={handleRequireLogin}
            />
          </div>

          <div className="mb-6 sm:mb-8">
            <CollectionsManager
              productSlug={product.slug}
              userCollections={localCollections}
              user={user}
              onOpenAddDialog={() => setShowAddToCollectionDialog(true)}
              onRequireLogin={handleRequireLogin}
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <CollapsibleCard title="Discussion" defaultOpen>
            <DiscussionSection
              discussions={visibleProductDiscussions}
              user={user}
              userAccount={userAccount || null}
              onDiscuss={onDiscuss}
              onEditDiscussion={onEditDiscussion}
              onDeleteDiscussion={onDeleteDiscussion}
              onToggleBlockDiscussion={onToggleBlockDiscussion}
            />
          </CollapsibleCard>

          <CollapsibleCard title="Editors" defaultOpen={false}>
            <ProductEditors
              productId={product.id}
              username={user?.username || null}
              isEditor={!!user && (product.createdBy === user.id || product.submittedBy === user.id || (product.editorIds?.includes(user.id) || false))}
              userAccount={userAccount}
              onEditorsChange={() => { }}
              autoOpenRequestForm={autoOpenOwnershipRequest}
            />
          </CollapsibleCard>
        </div>
      </div>

      {user && showAddToCollectionDialog && onAddToCollection && onRemoveFromCollection && (
        <AddToCollectionDialog
          open={showAddToCollectionDialog}
          onOpenChange={setShowAddToCollectionDialog}
          collections={localCollections}
          currentUserId={user.id}
          productSlug={product.slug}
          onAddToCollection={async (collectionSlug) => {
            await onAddToCollection(collectionSlug)
            // Refresh collections after adding
            await loadCollections()
          }}
          onRemoveFromCollection={async (collectionSlug) => {
            await onRemoveFromCollection(collectionSlug)
            // Refresh collections after removing
            await loadCollections()
          }}
          onCreateNew={() => {
            setShowAddToCollectionDialog(false)
            setShowCreateCollectionDialog(true)
          }}
        />
      )}

      {user && onCreateCollection && (
        <CreateCollectionDialog
          open={showCreateCollectionDialog}
          onOpenChange={setShowCreateCollectionDialog}
          onCreateCollection={async (collectionData) => {
            await onCreateCollection(collectionData)
            setShowCreateCollectionDialog(false)
            // Refresh collections list after creating a new one
            await loadCollections()
          }}
          initialProductSlugs={[product.slug]}
          username={user.username}
        />
      )}

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban Product</DialogTitle>
            <DialogDescription>
              Provide an optional reason for banning this product. Leave blank if no reason is needed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Input
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason for banning..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmBan}>Ban Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}