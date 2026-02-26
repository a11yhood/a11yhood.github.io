/**
 * ProductCard component - displays product summary in card layout.
 * 
 * Accessibility: Full keyboard navigation support with Enter/Space activation.
 * Star rating includes proper ARIA labels for screen readers.
 * All interactive elements are focusable and have clear visual focus indicators.
 * 
 * Performance: Memoized with custom comparison to prevent unnecessary re-renders
 * when parent ratings array changes. Only re-renders if the product, user, or
 * product-specific ratings change.
 */
import { memo, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StarRating } from './StarRating'
import { Product, Rating, UserData, UserAccount } from '@/lib/types'
import { cn, formatSourceLabel, getSourceIcon, calculateAverageRating, formatRelativeTime } from '@/lib/utils'
import { Trash, ArrowUpRight, Prohibit, CheckCircle } from '@phosphor-icons/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import MarkdownText from '@/components/ui/MarkdownText'

/**
 * ProductCard component props.
 * 
 * @param product - Product data to display
 * @param ratings - All ratings (filtered by productId internally)
 * @param onClick - Handler for card click (navigates to product detail)
 * @param onDelete - Optional delete handler (only shown to moderators/admins)
 * @param user - Current user data (for rating display)
 * @param onRate - Optional rating handler (enables interactive star rating)
 * @param userAccount - Full user account (used for role-based UI like delete button)
 */
type ProductCardProps = {
  product: Product
  ratings: Rating[]
  href?: string
  onNavigate?: () => void
  onClick?: () => void
  onDelete?: (productId: string) => void
  user?: UserData | null
  onRate?: (productId: string, rating: number) => void
  userAccount?: UserAccount | null
  showBannedBadge?: boolean
  canModerate?: boolean
  onToggleBan?: () => void
}

export const ProductCard = memo(function ProductCard({ product, ratings, href, onNavigate, onClick, onDelete, user, onRate, userAccount, showBannedBadge, canModerate, onToggleBan }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  // Only filter and compute ratings for this specific product to avoid unnecessary work
  const productRatings = useMemo(() => ratings.filter((r) => r.productId === product.id), [ratings, product.id])
  const averageRating = useMemo(() => calculateAverageRating(product.sourceRating, productRatings, product.id), [product.sourceRating, productRatings, product.id])
  const displayRating = Number.isFinite(averageRating) ? averageRating : 0
  const userRating = useMemo(() => user ? productRatings.find((r) => r.userId === user.id)?.rating : undefined, [user, productRatings])

  // Support both snake_case and camelCase from API
  const updatedTs = (product as any).source_last_updated ?? (product as any).sourceLastUpdated
  const updatedText = updatedTs ? formatRelativeTime(updatedTs) : ''

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[ProductCard.handleDelete] Delete button clicked for product:', { 
      productId: product.id, 
      productName: product.name,
      onDeleteExists: !!onDelete,
      userAccountRole: userAccount?.role,
      canModerate
    })
    const targetId = product.slug || product.id
    if (onDelete && targetId && confirm(`Are you sure you want to delete "${product.name}"?`)) {
      console.log('[ProductCard.handleDelete] Confirmed, calling onDelete with ID:', targetId)
      onDelete(targetId)
    } else {
      console.log('[ProductCard.handleDelete] Delete cancelled or onDelete not provided')
    }
  }

  const handleRate = (rating: number) => {
    if (onRate) {
      onRate(product.id, rating)
    }
  }

  const isInteractiveRating = !!onRate && !!user

  const sourceIcon = getSourceIcon(product.source)
  const sourceLabel = formatSourceLabel(product.source)
  const canModerateFlag = canModerate ?? (userAccount?.role === 'admin' || userAccount?.role === 'moderator')
  const showBanned = showBannedBadge && product.banned
  const activate = onNavigate ?? onClick

  const handleCardClick = (e: React.MouseEvent) => {
    if (href && (e.button === 1 || e.metaKey || e.ctrlKey)) {
      window.open(href, '_blank', 'noopener')
      return
    }
    activate?.()
  }

  const handleNameClick = (e: React.MouseEvent) => {
    if (href && (e.metaKey || e.ctrlKey || e.button === 1)) return
    e.preventDefault()
    activate?.()
  }

  const shouldShowImage = !!product.imageUrl && !imageError

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 overflow-hidden',
        'hover:shadow-lg hover:-translate-y-1',
        'focus-within:ring-2 focus-within:ring-ring',
        'relative'
      )}
      onClick={handleCardClick}
      onAuxClick={(e) => {
        if (e.button === 1) handleCardClick(e)
      }}
      role="article"
      aria-labelledby={`product-title-${product.id}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate?.()
        }
      }}
    >
      {/* Banned Ribbon */}
      {showBanned && (
        <div className="absolute top-0 right-0 z-10 overflow-hidden w-24 h-24 pointer-events-none">
          <div className="absolute top-5 right-[-32px] w-32 bg-destructive text-destructive-foreground text-center leading-6 font-bold text-xs shadow-md transform rotate-45">
            BANNED
          </div>
        </div>
      )}
      
      {shouldShowImage ? (
        <div className="w-full h-[200px] bg-muted overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.imageAlt || `${product.name} image`}
            className="w-full h-full object-cover object-center"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="w-full h-[200px] bg-muted flex items-center justify-center text-xs text-muted-foreground">
          <span aria-hidden="true">Image unavailable</span>
          <span className="sr-only">No image available</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h3 id={`product-title-${product.id}`} className="font-semibold text-lg leading-tight flex-1 min-w-0">
              {href ? (
                <a
                  href={href}
                  onClick={handleNameClick}
                  className="line-clamp-2 break-words hover:text-primary transition-colors"
                >
                  {product.name}
                </a>
              ) : (
                <span className="line-clamp-2 break-words">{product.name}</span>
              )}
            </h3>
            {showBanned && (
              <Badge variant="destructive" className="text-[11px] font-semibold">
                Banned
              </Badge>
            )}
            <div className="flex items-center gap-1 shrink-0 pointer-events-none">
              <span className="text-xs font-semibold text-muted-foreground">
                {displayRating.toFixed(1)}
              </span>
              <span className="text-primary text-sm">★</span>
            </div>
          </div>

          <h4 className="sr-only">Description</h4>
          <MarkdownText
            text={product.description}
            className="text-sm text-muted-foreground line-clamp-2"
          />

          <h4 className="sr-only">Tags</h4>
	  <ul>
          {product.tags && product.tags.length > 0 && (
            <li className="flex flex-wrap gap-2">
              {Array.from(new Set(product.tags)).slice(0, 10).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {product.tags.length > 10 && (
                <span className="text-xs text-muted-foreground">...</span>
              )}
            </li>
          )}
	  </ul>
	  
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="shrink-0 text-xs">
              {product.type}
            </Badge>
            {sourceLabel && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {sourceLabel}
              </Badge>
            )}
            {(productRatings.length > 0 || product.sourceRatingCount || product.stars) && (
              <p className="text-xs text-muted-foreground">
                {product.stars !== undefined && <>★ {product.stars} </>}
                {productRatings.length > 0 && (
                  <>{productRatings.length} user{productRatings.length === 1 ? '' : 's'} </>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {sourceIcon && (
                  <FontAwesomeIcon icon={sourceIcon} className="w-3.5 h-3.5" />
                )}
                <p>{sourceLabel}</p>
                <ArrowUpRight size={12} />
              </a>
              {updatedText && (
                <p className="text-xs text-muted-foreground">
                  Updated {updatedText}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canModerateFlag && onToggleBan && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleBan()
                  }}
                  className="h-8 w-8 p-0"
                  aria-label={product.banned ? 'Unban product' : 'Ban product'}
                >
                  {product.banned ? <CheckCircle size={16} /> : <Prohibit size={16} />}
                </Button>
              )}
              {canModerateFlag && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Delete product"
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
          </div>

          {isInteractiveRating && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <label className="text-xs font-medium">Rate this product:</label>
              <div className="flex justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <StarRating
                  value={userRating || 0}
                  onChange={handleRate}
                  readonly={false}
                  size={20}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if product, user, or product-specific ratings changed
  if (prevProps.product.id !== nextProps.product.id) return false
  if (prevProps.user?.id !== nextProps.user?.id) return false
  if (prevProps.userAccount?.id !== nextProps.userAccount?.id) return false
  if (prevProps.onDelete !== nextProps.onDelete) return false
  if (prevProps.onRate !== nextProps.onRate) return false
  if (prevProps.showBannedBadge !== nextProps.showBannedBadge) return false
  if (prevProps.onClick !== nextProps.onClick) return false
  if (prevProps.onNavigate !== nextProps.onNavigate) return false
  
  // Compare only this product's ratings
  const prevProductRatings = prevProps.ratings.filter(r => r.productId === prevProps.product.id)
  const nextProductRatings = nextProps.ratings.filter(r => r.productId === nextProps.product.id)
  if (prevProductRatings.length !== nextProductRatings.length) return false
  
  // If all checks pass, skip re-render
  return true
})
