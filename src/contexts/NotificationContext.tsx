/**
 * NotificationContext – in-DOM notification system.
 *
 * Replaces Sonner's popup toasts with an accessible alert banner rendered
 * directly in the page, below the header navbar. This keeps notifications
 * in the normal document flow instead of a ARIA-live overlay popup.
 *
 * Usage:
 *   const { notify } = useNotifications()
 *   notify.success('Saved!')
 *   notify.error('Something went wrong.')
 *   notify.info('Tip: you can do X.')
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type NotificationType = 'success' | 'error' | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  message: string
  /** Set when raised while a modal dialog was open: rendered inside that dialog, not in the page banner. */
  modalId?: string
}

interface NotificationContextValue {
  notifications: AppNotification[]
  notify: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
  dismiss: (id: string) => void
  /** Remove every notification scoped to a dialog (called when the dialog unmounts). */
  dismissModal?: (modalId: string) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

/**
 * Only modals that mount <DialogNotifications /> (which sets data-notifications-host) can show
 * scoped messages. Anything else, e.g. a bare Radix Dialog, keeps using the page banner so a message
 * is never routed somewhere that cannot render it.
 */
const OPEN_MODAL_SELECTOR =
  '[data-notifications-host][role="dialog"][data-state="open"], [data-notifications-host][role="alertdialog"][data-state="open"]'

/** id of the topmost open notification-hosting modal (portals append in open order), if any. */
function topmostModalId(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const modals = document.querySelectorAll<HTMLElement>(OPEN_MODAL_SELECTOR)
  return modals[modals.length - 1]?.id || undefined
}

/** Auto-dismiss delay per type (ms). Errors require explicit dismissal. */
const AUTO_DISMISS_MS: Record<NotificationType, number | null> = {
  success: 10000,
  info: 10000,
  error: null,
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  // Track active timers so we can cancel on manual dismiss
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback(
    (type: NotificationType, message: string) => {
      const id = crypto.randomUUID()
      // Raised from inside a dialog: show it in that dialog (the page banner is covered and aria-hidden).
      const modalId = topmostModalId()
      // Replace an identical message instead of stacking duplicates; the new id makes it re-announce.
      setNotifications((prev) => [
        ...prev.filter((n) => !(n.type === type && n.message === message && n.modalId === modalId)),
        { id, type, message, modalId },
      ])

      // Dialog-scoped messages persist until dismissed or the dialog closes.
      const delay = modalId ? null : AUTO_DISMISS_MS[type]
      if (delay !== null) {
        const timer = setTimeout(() => dismiss(id), delay)
        timers.current.set(id, timer)
      }
    },
    [dismiss],
  )

  const dismissModal = useCallback((modalId: string) => {
    setNotifications((prev) => prev.filter((n) => n.modalId !== modalId))
  }, [])

  const notify = useMemo(
    () => ({
      success: (message: string) => addNotification('success', message),
      error: (message: string) => addNotification('error', message),
      info: (message: string) => addNotification('info', message),
    }),
    [addNotification],
  )

  // Clear all pending timers when the provider unmounts to avoid state updates
  // on an unmounted component (common in tests and future refactors).
  useEffect(() => {
    const currentTimers = timers.current
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer))
      currentTimers.clear()
    }
  }, [])

  const value = useMemo(
    () => ({ notifications, notify, dismiss, dismissModal }),
    [notifications, notify, dismiss, dismissModal],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

/** No-op fallback used when a component is rendered outside NotificationProvider (e.g. isolated unit tests). */
const NOOP_NOTIFY = {
  success: (_message: string) => {},
  error: (_message: string) => {},
  info: (_message: string) => {},
}
const NOOP_CONTEXT: NotificationContextValue = {
  notifications: [],
  notify: NOOP_NOTIFY,
  dismiss: (_id: string) => {},
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  // Return a no-op implementation outside the provider so isolated unit tests
  // can render components that call notify without requiring the full provider tree.
  return ctx ?? NOOP_CONTEXT
}
