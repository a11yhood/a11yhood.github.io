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
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useNotifications, type NotificationType } from '@/contexts/NotificationContext'
import { cn } from '@/lib/utils'

const styles: Record<NotificationType, string> = {
  success: 'bg-green-50 border-green-300 text-green-900 dark:bg-green-950 dark:border-green-700 dark:text-green-100',
  error: 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-100',
  info: 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-100',
}

const icons: Record<NotificationType, React.ReactElement> = {
  success: <CheckCircle size={16} aria-hidden="true" />,
  error: <AlertCircle size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
}

export function DialogNotifications() {
  const { notifications, dismiss, dismissModal } = useNotifications()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [modalId, setModalId] = useState<string | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const focusedIds = useRef<Set<string>>(new Set())

  // Identify the enclosing dialog (Radix gives the content element a stable id).
  useEffect(() => {
    const id = anchorRef.current?.closest('[role="dialog"], [role="alertdialog"]')?.id ?? null
    setModalId(id)
    return () => {
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
    <div
      key={n.id}
      ref={(el) => {
        if (el) itemRefs.current.set(n.id, el)
        else itemRefs.current.delete(n.id)
      }}
      tabIndex={n.type === 'error' ? -1 : undefined}
      className={cn('flex w-full items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm', styles[n.type], 'focus:outline-none focus-visible:ring-2 focus-visible:ring-current')}
    >
      <span className="flex items-start gap-2">
        <span className="mt-0.5">{icons[n.type]}</span>
        {n.message}
      </span>
      <button
        type="button"
        onClick={() => dismiss(n.id)}
        aria-label="Dismiss notification"
        className="ml-2 flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )

  return (
    <div ref={anchorRef} className="empty:hidden">
      <div role="alert" aria-live="assertive" aria-atomic="false" className="space-y-2 empty:hidden">
        {errors.map(renderItem)}
      </div>
      <div role="status" aria-live="polite" aria-atomic="false" className="space-y-2 empty:hidden">
        {others.map(renderItem)}
      </div>
    </div>
  )
}
