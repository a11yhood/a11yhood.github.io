/**
 * StarRating component - displays and captures star ratings.
 * 
 * Accessibility: Uses radiogroup role with proper ARIA labels.
 * Each star has descriptive label ("1 star", "2 stars", etc.) for screen readers.
 * Supports keyboard interaction (Enter/Space to select rating).
 * Half-star display uses CSS overflow technique for precise visual feedback.
 */
import { Star } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * StarRating component props.
 * 
 * @param value - Current rating value (supports fractional values for half stars)
 * @param onChange - Handler called when user selects a rating
 * @param readonly - If true, displays rating without interaction
 * @param size - Star icon size in pixels (default: 20)
 * @param showValue - If true, displays numeric rating next to stars
 * @param className - Additional CSS classes for styling
 */
type StarRatingProps = {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: number
  showValue?: boolean
  className?: string
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 20,
  showValue = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (!readonly && onChange) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onChange(rating)
      }
    }
  }

  const displayValue = hoverValue || value

  /**
   * Calculate star fill state (full, half, or empty).
   * Uses fractional logic to determine if star should be fully filled,
   * half filled (via CSS overflow), or empty.
   */
  const getStarFill = (position: number) => {
    const diff = displayValue - position + 1
    if (diff >= 1) return 'full'
    if (diff > 0 && diff < 1) return 'half'
    return 'empty'
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label={readonly ? "Product rating" : "Rate this product"}
        onMouseLeave={() => !readonly && setHoverValue(0)}
      >
        {[1, 2, 3, 4, 5].map((rating) => {
          const fillType = getStarFill(rating)
          
          const star = fillType === 'half' ? (
            <div className="relative inline-flex" style={{ width: size, height: size }}>
              <Star
                size={size}
                weight="regular"
                className="absolute inset-0 text-muted-foreground"
              />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${size / 2}px` }}>
                <Star
                  size={size}
                  weight="fill"
                  className="text-accent"
                />
              </div>
            </div>
          ) : (
            <Star
              size={size}
              weight={fillType === 'full' ? 'fill' : 'regular'}
              className={cn(
                'transition-colors duration-150',
                fillType === 'full' ? 'text-accent' : 'text-muted-foreground'
              )}
            />
          )

          if (readonly || !onChange) {
            return (
              <span 
                key={rating} 
                role="radio"
                aria-checked={value === rating}
                aria-label={`${rating} stars`}
                className="inline-flex cursor-default"
              >
                {star}
              </span>
            )
          }

          return (
            <button
              key={rating}
              type="button"
              role="radio"
              aria-checked={value === rating}
              aria-label={`Rate ${rating} stars`}
              onClick={() => handleClick(rating)}
              onKeyDown={(e) => handleKeyDown(e, rating)}
              onMouseEnter={() => setHoverValue(rating)}
              className={cn(
                'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded cursor-pointer hover:scale-110'
              )}
            >
              {star}
            </button>
          )
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-foreground ml-1">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}
