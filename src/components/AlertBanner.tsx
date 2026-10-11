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
 * - Notifications raised while a dialog is open carry a modalId and are rendered by
 *   DialogNotifications inside that dialog instead (this banner is covered and aria-hidden then).
 */
import { useNotifications } from '@/contexts/NotificationContext'
import { NotificationItem } from '@/components/NotificationItem'
import { cn } from '@/lib/utils'

export function AlertBanner() {
  const { notifications: all, dismiss } = useNotifications()
  const notifications = all.filter((n) => !n.modalId)

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
          <div role="alert" aria-live="assertive" aria-atomic="false" className="space-y-2">
            {errors.map((n) => (
              <NotificationItem key={n.id} notification={n} onDismiss={dismiss} variant="banner" />
            ))}
          </div>
        )}

        {/* Polite region – success/info don't interrupt */}
        {others.length > 0 && (
          <div role="status" aria-live="polite" aria-atomic="false" className="space-y-2">
            {others.map((n) => (
              <NotificationItem key={n.id} notification={n} onDismiss={dismiss} variant="banner" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
