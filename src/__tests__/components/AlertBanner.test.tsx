import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AlertBanner } from '@/components/AlertBanner'
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext'

function NotificationHarness() {
  const { notify } = useNotifications()

  return (
    <div>
      <button type="button" onClick={() => notify.success('First notification')}>
        Add First
      </button>
      <button type="button" onClick={() => notify.info('Second notification')}>
        Add Second
      </button>
      <button type="button" onClick={() => notify.error('Third notification')}>
        Add Third
      </button>
      <AlertBanner />
    </div>
  )
}

describe('AlertBanner', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps success notifications visible before the 10-second timeout', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Add First' }))
    expect(screen.getByText('First notification')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(9999)
    })

    expect(screen.getByText('First notification')).toBeInTheDocument()
  })

  it('auto-dismisses success and info notifications at 10 seconds', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Add First' }))
    await user.click(screen.getByRole('button', { name: 'Add Second' }))

    expect(screen.getByText('First notification')).toBeInTheDocument()
    expect(screen.getByText('Second notification')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    await waitFor(() => {
      expect(screen.queryByText('First notification')).not.toBeInTheDocument()
      expect(screen.queryByText('Second notification')).not.toBeInTheDocument()
    })
  })

  it('does not auto-dismiss error notifications', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Add Third' }))
    expect(screen.getByText('Third notification')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(20_000)
    })

    expect(screen.getByText('Third notification')).toBeInTheDocument()
  })

  it('renders notifications in a labeled region', async () => {
    const user = userEvent.setup()

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Add First' }))

    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('shows multiple notifications when a new one arrives before dismissing the first', async () => {
    const user = userEvent.setup()

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Add First' }))
    await user.click(screen.getByRole('button', { name: 'Add Second' }))

    expect(screen.getByText('First notification')).toBeInTheDocument()
    expect(screen.getByText('Second notification')).toBeInTheDocument()
  })

  it('dismisses only the selected notification', async () => {
    const user = userEvent.setup()

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Add First' }))
    await user.click(screen.getByRole('button', { name: 'Add Second' }))

    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss notification' })
    await user.click(dismissButtons[0])

    expect(screen.queryByText('First notification')).not.toBeInTheDocument()
    expect(screen.getByText('Second notification')).toBeInTheDocument()
  })

  it('adds a scrollbar when more than two notifications are active', async () => {
    const user = userEvent.setup()

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Add First' }))
    await user.click(screen.getByRole('button', { name: 'Add Second' }))
    await user.click(screen.getByRole('button', { name: 'Add Third' }))

    const politeRegion = screen.getByText('First notification').closest('div[aria-live="polite"]')
    const scrollContainer = politeRegion?.parentElement

    expect(scrollContainer).toHaveClass('overflow-y-auto')
  })
})
