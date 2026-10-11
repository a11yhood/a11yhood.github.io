/**
 * DialogNotifications – shows notify.* messages inside the dialog that was open when they were raised.
 *
 * Why: an open Radix dialog covers the page and marks everything outside it aria-hidden, so the
 * global AlertBanner is neither visible nor announced. Messages raised from within a dialog are
 * therefore routed here (see NotificationContext) and rendered as part of the dialog. They persist
 * until dismissed or the dialog closes (no auto-dismiss), so braille display and screen magnifier
 * users are not racing a timer.
 *
 * The live-region containers are always mounted (empty) so assistive tech registers them before
 * text arrives; role/aria-live are on the container, not on the inserted message.
 */
import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { NotificationItem } from '@/components/NotificationItem'

export function DialogNotifications({ className }: { className?: string }) {
  const { notifications, dismiss, dismissModal } = useNotifications()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [modalId, setModalId] = useState<string | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const focusedIds = useRef<Set<string>>(new Set())

  // Identify the enclosing dialog (Radix gives the content element a stable id).
  useEffect(() => {
    const modal = anchorRef.current?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"]')
    const id = modal?.id || null
    setModalId(id)
    // Advertise that this surface can render its own notifications. NotificationContext only scopes
    // messages to modals carrying this marker; any other open modal falls back to the page banner.
    modal?.setAttribute('data-notifications-host', '')
    return () => {
      modal?.removeAttribute('data-notifications-host')
      if (id) dismissModal?.(id)
    }
  }, [dismissModal])

  const mine = modalId ? notifications.filter((n) => n.modalId === modalId) : []
  const errors = mine.filter((n) => n.type === 'error')
  const others = mine.filter((n) => n.type !== 'error')

  // Move focus to a newly raised error: screen readers reliably read focused text, whereas live
  // regions inside a freshly opened dialog are frequently missed.
  const newestErrorId = errors.length ? errors[errors.length - 1].id : null
  useEffect(() => {
    if (newestErrorId && !focusedIds.current.has(newestErrorId)) {
      focusedIds.current.add(newestErrorId)
      itemRefs.current.get(newestErrorId)?.focus()
    }
  }, [newestErrorId])

  const renderItem = (n: (typeof mine)[number]) => (
    <NotificationItem
      key={n.id}
      notification={n}
      onDismiss={dismiss}
      variant="dialog"
      focusable={n.type === 'error'}
      itemRef={(el) => {
        if (el) itemRefs.current.set(n.id, el)
        else itemRefs.current.delete(n.id)
      }}
    />
  )

  return (
    // Visually hidden (but still in the accessibility tree, so the live regions stay registered)
    // while there is nothing to show; avoids adding an empty row to the dialog's grid/flex gap.
    <div ref={anchorRef} className={mine.length === 0 ? 'sr-only' : className}>
      <div role="alert" aria-live="assertive" aria-atomic="false" className="space-y-2">
        {errors.map(renderItem)}
      </div>
      <div role="status" aria-live="polite" aria-atomic="false" className="space-y-2">
        {others.map(renderItem)}
      </div>
    </div>
  )
}
