import { memo, useMemo, useState } from 'react'
import { StarRating } from './StarRating'
import { Product, Rating, UserData } from '@/lib/types'
import { cn, formatSourceLabel, getSourceIcon, calculateAverageRating, formatRelativeTime } from '@/lib/utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import MarkdownText from '@/components/ui/MarkdownText'
import { Prohibit, Trash } from '@phosphor-icons/react'

type ProductListItemProps = {
  product: Product
  ratings: Rating[]
  href?: string
  onNavigate?: () => void
  user?: UserData | null
  onRate?: (productId: string, rating: number) => void
  showBannedBadge?: boolean
  canModerate?: boolean
  onToggleBan?: () => void
  onDelete?: (productId: string) => void
}

export const ProductListItem = memo(function ProductListItem({ product, ratings, href, onNavigate, user, onRate, showBannedBadge, canModerate, onToggleBan, onDelete }: ProductListItemProps) {
  const [imageError, setImageError] = useState(false)
  const productRatings = useMemo(() => ratings.filter((r) => r.productId === product.id), [ratings, product.id])
  const averageRating = useMemo(() => calculateAverageRating(product.sourceRating, productRatings, product.id), [product.sourceRating, productRatings, product.id])
  const userRating = useMemo(() => user ? productRatings.find((r) => r.userId === user.id)?.rating : undefined, [user, productRatings])

  const handleRate = (rating: number) => {
    if (onRate) {
      onRate(product.id, rating)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      onDelete(product.id)
    }
  }

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }

  const sourceIcon = getSourceIcon(product.source)
  const sourceLabel = formatSourceLabel(product.source)
  const updatedTs = (product as any).source_last_updated ?? (product as any).sourceLastUpdated
  const updatedText = updatedTs ? formatRelativeTime(updatedTs) : ''
  const shouldShowImage = !!product.imageUrl && !imageError

  const handleCardClick = (e: React.MouseEvent) => {
    if (href && (e.button === 1 || e.metaKey || e.ctrlKey)) {
      window.open(href, '_blank', 'noopener')
      return
    }
    onNavigate?.()
  }

  const handleNameClick = (e: React.MouseEvent) => {
    if (href && (e.metaKey || e.ctrlKey || e.button === 1)) return
    e.preventDefault()
    onNavigate?.()
  }

  return (
    <div
      className={cn(
        'px-4 py-4 cursor-pointer transition-all duration-150',
        'hover:bg-muted/50',
        'focus-within:ring-2 focus-within:ring-ring focus-within:bg-muted/50',
        'border-b border-border last:border-b-0'
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
          onNavigate()
        }
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 id={`product-title-${product.id}`} className="font-medium text-base leading-tight min-w-0 flex-1">
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
              <div className="flex items-center gap-1 flex-shrink-0" onClick={handleStarClick}>
                {productRatings.length > 0 && (
                  <>
                    <span className="text-sm font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-primary text-sm">★</span>
                  </>
                )}
              </div>
              <span className="text-sm capitalize text-muted-foreground flex-shrink-0">{product.type}</span>
            </div>

            <h4 className="sr-only">Description</h4>
            {product.description && (
              <div className="w-full">
                <MarkdownText
                  text={truncateText(product.description, 120)}
                  className="text-sm text-muted-foreground line-clamp-2"
                />
              </div>
            )}

            <h4 className="sr-only">Tags</h4>
            <div className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
  	    <ul className="flex flex-wrap gap-1.5">
                {product.tags.slice(0, 20).map((tag) => (
                  <li key={tag} className="px-1.5 py-0 bg-muted rounded-sm text-xs whitespace-nowrap">
                    {tag}
                  </li>
                ))}
                {product.tags.length > 20 && (
                  <li className="text-xs text-muted-foreground">...</li>
                )}
  	      </ul>
            </div>
          </div>

          {shouldShowImage ? (
            <div className="w-full sm:w-28 flex-shrink-0">
              <div className="w-full h-12 bg-muted overflow-hidden rounded-sm">
                <img
                  src={product.imageUrl}
                  alt={product.imageAlt || `${product.name} image`}
                  className="w-full h-full object-cover object-center"
                  onError={() => setImageError(true)}
                />
              </div>
            </div>
          ) : (
            <div className="w-full sm:w-28 flex-shrink-0">
              <div className="w-full h-12 bg-muted overflow-hidden rounded-sm flex items-center justify-center text-[11px] text-muted-foreground">
                <span aria-hidden="true">Image unavailable</span>
                <span className="sr-only">No image available for {product.name}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end text-sm text-muted-foreground">
          {sourceIcon && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              <FontAwesomeIcon
                icon={sourceIcon}
                className="w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{sourceLabel}</span>
            </span>
          )}
          {product.stars !== undefined && product.stars > 0 && (
            <span>★ {product.stars}</span>
          )}
          {updatedText && (
            <span className="text-muted-foreground">• Updated {updatedText}</span>
          )}
          {showBannedBadge && product.banned && (
            <Prohibit
              size={16}
              className="text-destructive"
              aria-label="Banned"
            />
          )}
          {canModerate && onToggleBan && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                onToggleBan()
              }}
              aria-label={product.banned ? 'Unban product' : 'Ban product'}
            >
              <Prohibit size={14} className={product.banned ? 'text-destructive' : 'text-muted-foreground'} />
            </Button>
          )}
          {canModerate && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/10"
              onClick={handleDelete}
              aria-label="Delete product"
            >
              <Trash size={14} className="text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if product, user, or product-specific ratings changed
  if (prevProps.product.id !== nextProps.product.id) return false
  if (prevProps.user?.id !== nextProps.user?.id) return false
  if (prevProps.onRate !== nextProps.onRate) return false
  if (prevProps.showBannedBadge !== nextProps.showBannedBadge) return false
  if (prevProps.onClick !== nextProps.onClick) return false
  
  // Compare only this product's ratings
  const prevProductRatings = prevProps.ratings.filter(r => r.productId === prevProps.product.id)
  const nextProductRatings = nextProps.ratings.filter(r => r.productId === nextProps.product.id)
  if (prevProductRatings.length !== nextProductRatings.length) return false
  
  // If all checks pass, skip re-render
  return true
})
