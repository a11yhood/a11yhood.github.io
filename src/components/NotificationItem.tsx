/**
 * NotificationItem – one dismissible notification, shared by AlertBanner (page level) and
 * DialogNotifications (inside dialogs) so both surfaces stay visually and semantically in sync.
 */
import type { Ref } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import type { AppNotification, NotificationType } from '@/contexts/NotificationContext'
import { cn } from '@/lib/utils'

const styles: Record<NotificationType, string> = {
  success:
    'bg-green-50 border-green-300 text-green-900 dark:bg-green-950 dark:border-green-700 dark:text-green-100',
  error:
    'bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-100',
  info:
    'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-100',
}

const icons: Record<NotificationType, React.ReactElement> = {
  success: <CheckCircle size={16} aria-hidden="true" />,
  error: <AlertCircle size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
}

const variants = {
  /** Full-bleed strip under the site header. */
  banner: 'items-center border border-x-0 px-4 py-2.5',
  /** Rounded card inside a dialog. */
  dialog: 'items-start rounded-md border px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-current',
} as const

export function NotificationItem({
  notification,
  onDismiss,
  variant,
  itemRef,
  focusable,
}: {
  notification: AppNotification
  onDismiss: (id: string) => void
  variant: keyof typeof variants
  itemRef?: Ref<HTMLDivElement>
  /** Make the item programmatically focusable (tabIndex -1) so it can receive focus when raised. */
  focusable?: boolean
}) {
  const { id, type, message } = notification
  return (
    <div
      ref={itemRef}
      tabIndex={focusable ? -1 : undefined}
      className={cn('flex w-full justify-between gap-2 text-sm', variants[variant], styles[type])}
    >
      <span className={cn('flex gap-2', variant === 'dialog' ? 'items-start' : 'items-center')}>
        <span className={variant === 'dialog' ? 'mt-0.5' : undefined}>{icons[type]}</span>
        {message}
      </span>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="ml-2 flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
