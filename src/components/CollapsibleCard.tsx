import { useId, useRef, useEffect } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import clsx from 'clsx'

export type CollapsibleCardProps = {
  title: React.ReactNode
  description?: React.ReactNode
  iconLeft?: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  className?: string
}

/**
 * CollapsibleCard
 *
 * Accessible disclosure built on <details>/<summary> styled like a Card.
 * - Keyboard/touch/assistive tech get native toggle behavior
 * - Arrow icon reflects state; summary has no default marker
 * - Use defaultOpen for uncontrolled, or open/onOpenChange for controlled usage
 */
export function CollapsibleCard({
  title,
  description,
  iconLeft,
  defaultOpen = true,
  open,
  onOpenChange,
  children,
  className,
}: CollapsibleCardProps) {
  const contentId = useId()
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (typeof open === 'boolean' && detailsRef.current) {
      if (detailsRef.current.open !== open) {
        detailsRef.current.open = open
      }
    }
  }, [open])

  return (
    <div
      data-slot="card"
      className={clsx(
        'bg-card text-card-foreground flex flex-col gap-0 rounded-xl border shadow-sm overflow-hidden',
        className
      )}
    >
      <details
        ref={detailsRef}
        open={open === undefined ? defaultOpen : open}
        onToggle={(e) => onOpenChange?.((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          data-slot="card-header"
          className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 py-6 cursor-pointer select-none [&::-webkit-details-marker]:hidden list-none"
          aria-controls={contentId}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {iconLeft}
                <div className="leading-none font-semibold" data-slot="card-title">
                  {title}
                </div>
              </div>
              {description && (
                <div className="text-muted-foreground text-sm mt-1" data-slot="card-description">
                  {description}
                </div>
              )}
            </div>
            <div
              aria-hidden="true"
              data-slot="card-action"
              className="inline-flex items-center justify-center size-9 rounded-md pointer-events-none"
            >
              {(detailsRef.current?.open ?? defaultOpen) ? (
                <CaretDown size={18} />
              ) : (
                <CaretRight size={18} />
              )}
            </div>
          </div>
        </summary>
        <div id={contentId} data-slot="card-content" className="px-6 pb-6">
          {children}
        </div>
      </details>
    </div>
  )
}
