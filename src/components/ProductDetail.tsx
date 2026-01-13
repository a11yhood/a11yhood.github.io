import { useState } from 'react'
import { ArrowLeft, Link as LinkIcon, Trash, FolderOpen, Plus, Prohibit, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { StarRating } from './StarRating'
import { DiscussionSection } from './DiscussionSection'
import { TagManager } from './TagManager'
import { LoginPrompt } from './LoginPrompt'
import { ProductEditDialog } from './ProductEditDialog'
import { AddToCollectionDialog } from './AddToCollectionDialog'
import { CreateCollectionDialog } from './CreateCollectionDialog'
import { ProductEditors } from './ProductEditors'
import { CollapsibleCard } from './CollapsibleCard'
import { Product, Rating, Discussion, UserData, Collection, CollectionCreateInput, UserAccount } from '@/lib/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUniversalAccess } from '@fortawesome/free-solid-svg-icons'
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
  onAddTag: (tag: string) => void
  onAddToCollection?: (collectionSlug: string) => void
  onRemoveFromCollection?: (collectionSlug: string) => void
  onCreateCollection?: (collection: CollectionCreateInput) => void
  allTags: string[]
  allProductTypes?: string[]
  onDelete?: (productId: string) => void
  onEdit?: (updatedProduct: Product) => void
  onToggleBan?: (product: Product, reason?: string) => void
  onEditDiscussion?: (id: string, content: string) => void
  onDeleteDiscussion?: (id: string) => void
  onToggleBlockDiscussion?: (id: string, block: boolean) => void
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
  autoOpenEdit,
  autoOpenOwnershipRequest,
}: ProductDetailProps) {
  const [imageError, setImageError] = useState(false)
  const shouldShowImage = !!product.imageUrl && !imageError
  const canModerate = userAccount?.role === 'admin' || userAccount?.role === 'moderator'
  const isEditor = !!userAccount?.id && (product.editorIds?.includes(userAccount.id) || false)
  const [showAddToCollectionDialog, setShowAddToCollectionDialog] = useState(false)
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] = useState(false)

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
    if (onDelete && targetId && confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
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

    const reason = window.prompt('Provide a reason for banning this product (optional):', product.bannedReason || '')
    onToggleBan(product, reason?.trim() || undefined)
  }

  const updatedTs = (product as any).source_last_updated ?? (product as any).sourceLastUpdated
  const updatedText = updatedTs ? formatRelativeTime(updatedTs) : ''

  const sourceIcon = getSourceIcon(product.source)
  const sourceLabel = formatSourceLabel(product.source)
  const sourceHost = getCanonicalHost(product.sourceUrl) || sourceLabel

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4 sm:mb-6 sm:flex-nowrap">
        <Button
          variant="ghost"
          onClick={onBack}
          className="-ml-2 flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
          aria-label="Back to products"
        >
          <ArrowLeft size={20} />
          <FontAwesomeIcon icon={faUniversalAccess} className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Products</span>
        </Button>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && onAddToCollection && (
            <Button
              variant="outline"
              onClick={() => setShowAddToCollectionDialog(true)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
              aria-label="Add to collection"
            >
              <Plus size={18} />
              <FolderOpen size={18} />
              <span className="hidden sm:inline">Add to Collection</span>
            </Button>
          )}
          {user && (canModerate || isEditor) && (
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
              <img
                src={product.imageUrl}
                alt={product.imageAlt || `${product.name} product image`}
                className="float-left mr-4 mb-3 sm:mr-6 sm:mb-4 rounded-lg max-w-[300px] w-full h-auto"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="float-left mr-4 mb-3 sm:mr-6 sm:mb-4 rounded-lg max-w-[300px] w-full h-auto min-h-[180px] bg-muted text-muted-foreground flex items-center justify-center text-sm">
                <span aria-hidden="true">Image unavailable</span>
                <span className="sr-only">No image available for {product.name}</span>
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

            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <StarRating value={averageRating} readonly size={24} showValue />
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
            <h2 className="text-lg sm:text-xl font-semibold">Your Rating</h2>
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <StarRating value={userRating} onChange={onRate} size={24} className="shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {userRating > 0 ? 'Click to change' : 'Click to rate'}
                </span>
              </div>
            ) : (
              <LoginPrompt context="rate" />
            )}
          </div>

          <div className="mb-6 sm:mb-8">
            <TagManager
              productId={product.id}
              currentTags={product.tags}
              allTags={allTags}
              onAddTag={onAddTag}
              user={user}
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
              username={user?.login || null}
              isEditor={!!user && (product.editorIds?.includes(user.id) || false)}
              userAccount={userAccount}
              onEditorsChange={() => {}}
              autoOpenRequestForm={autoOpenOwnershipRequest}
            />
          </CollapsibleCard>
        </div>
      </div>

      {user && onAddToCollection && onRemoveFromCollection && (
        <AddToCollectionDialog
          open={showAddToCollectionDialog}
          onOpenChange={setShowAddToCollectionDialog}
          collections={userCollections}
          productSlug={product.slug}
          onAddToCollection={onAddToCollection}
          onRemoveFromCollection={onRemoveFromCollection}
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
          onCreateCollection={(collectionData) => {
            onCreateCollection(collectionData)
            setShowCreateCollectionDialog(false)
          }}
          initialProductSlugs={[product.slug]}
          username={user.login}
        />
      )}
    </div>
  )
}
