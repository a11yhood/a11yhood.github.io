import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type ProductFilterTagVariant = 'card' | 'list'

type ProductFilterTagProps = {
  tag: string
  selected: boolean
  onTagClick?: (tag: string) => void
  variant?: ProductFilterTagVariant
}

export function ProductFilterTag({
  tag,
  selected,
  onTagClick,
  variant = 'card',
}: ProductFilterTagProps) {
  const clickable = !!onTagClick

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onTagClick?.(tag)
      }}
      aria-label={`Filter by tag ${tag}`}
      aria-pressed={selected}
      disabled={!clickable}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variant === 'card' ? 'rounded-md focus-visible:ring-offset-2' : 'rounded-sm focus-visible:ring-offset-1',
      )}
    >
      {variant === 'card' ? (
        <Badge
          variant="secondary"
          className={cn(
            'text-xs transition-all duration-150',
            clickable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
            selected
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 ring-1 ring-primary/40'
              : 'border-border/70 hover:bg-primary/25 hover:text-primary',
          )}
        >
          {tag}
        </Badge>
      ) : (
        <span
          className={cn(
            'inline-block px-1.5 py-0 rounded-sm text-xs whitespace-nowrap transition-all duration-150',
            clickable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default bg-muted',
            selected
              ? 'bg-primary text-primary-foreground ring-1 ring-primary/40 hover:bg-primary/90'
              : 'bg-muted hover:bg-primary/25 hover:text-primary',
          )}
        >
          {tag}
        </span>
      )}
    </button>
  )
}
