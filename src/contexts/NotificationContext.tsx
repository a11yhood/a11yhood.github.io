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
}

interface NotificationContextValue {
  notifications: AppNotification[]
  notify: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
  dismiss: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

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
      setNotifications((prev) => [...prev, { id, type, message }])

      const delay = AUTO_DISMISS_MS[type]
      if (delay !== null) {
        const timer = setTimeout(() => dismiss(id), delay)
        timers.current.set(id, timer)
      }
    },
    [dismiss],
  )

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
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer))
      timers.current.clear()
    }
  }, [])

  const value = useMemo(
    () => ({ notifications, notify, dismiss }),
    [notifications, notify, dismiss],
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

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  // Return a no-op implementation outside the provider so isolated unit tests
  // can render components that call notify without requiring the full provider tree.
  return ctx ?? NOOP_CONTEXT
}
