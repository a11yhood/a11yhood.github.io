/**
 * AlertBanner – renders app notifications as inline DOM elements.
 *
 * Placed directly below the site header so screen-reader and keyboard users
 * encounter alerts in the natural reading / tab order, without relying on
 * ARIA live-region popups that appear outside the normal document flow.
 *
 * Accessibility:
 * - The container has role="status" / aria-live="polite" for successes and
 *   infos, so assistive tech announces them without interrupting the user.
 * - Errors use role="alert" (aria-live="assertive") so they interrupt
 *   immediately—errors require the user's attention before continuing.
 * - Each banner has a visible dismiss button with an accessible label.
 * - Error banners do not auto-dismiss; they must be explicitly closed.
 */
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useNotifications, type NotificationType } from '@/contexts/NotificationContext'
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

export function AlertBanner() {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) return null
  const shouldScroll = notifications.length > 2

  // Separate by urgency for correct aria-live semantics
  const errors = notifications.filter((n) => n.type === 'error')
  const others = notifications.filter((n) => n.type !== 'error')

  return (
    <section aria-label="Notifications" className="w-full border-b border-border/50 bg-(--color-bg) shadow-sm">
      <div
        className={cn(
          'space-y-2 px-4 py-2 sm:px-6',
          shouldScroll && 'max-h-[7.5rem] overflow-y-auto pr-2',
        )}
      >
        {/* Assertive region – errors interrupt the user */}
        {errors.length > 0 && (
          <div aria-live="assertive" aria-atomic="false" className="space-y-2">
            {errors.map((n) => (
              <div
                key={n.id}
                role="alert"
                className={cn(
                  'flex w-full items-center justify-between gap-2 border border-x-0 px-4 py-2.5 text-sm',
                  styles[n.type],
                )}
              >
                <span className="flex items-center gap-2">
                  {icons[n.type]}
                  {n.message}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss(n.id)}
                  aria-label="Dismiss notification"
                  className="ml-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current flex-shrink-0"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Polite region – success/info don't interrupt */}
        {others.length > 0 && (
          <div aria-live="polite" aria-atomic="false" className="space-y-2">
            {others.map((n) => (
              <div
                key={n.id}
                role="status"
                className={cn(
                  'flex w-full items-center justify-between gap-2 border border-x-0 px-4 py-2.5 text-sm',
                  styles[n.type],
                )}
              >
                <span className="flex items-center gap-2">
                  {icons[n.type]}
                  {n.message}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss(n.id)}
                  aria-label="Dismiss notification"
                  className="ml-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current flex-shrink-0"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
