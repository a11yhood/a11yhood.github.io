import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestSourceDialog } from '@/components/RequestSourceDialog'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { APIService } from '@/lib/api'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ getAccessToken: vi.fn().mockResolvedValue('test-token') }),
}))

describe('RequestSourceDialog', () => {
  const onOpenChange = vi.fn()

  const renderDialog = () =>
    render(
      <NotificationProvider>
        <RequestSourceDialog
          open
          onOpenChange={onOpenChange}
          domain="makersmakingchange.com"
          url="https://www.makersmakingchange.com/product/x"
        />
      </NotificationProvider>
    )

  const submitWithReason = async () => {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/why would you like/i), 'Great source of accessible products')
    await user.click(screen.getByRole('button', { name: /submit request/i }))
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    onOpenChange.mockClear()
  })

  it('shows a pending-request error inside the dialog, not the page banner (#478)', async () => {
    vi.spyOn(APIService, 'createUserRequest').mockRejectedValue(
      new Error('You already have a pending source-domain request')
    )
    renderDialog()

    // Live region is mounted before any error so assistive tech registers it
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    await submitWithReason()

    await waitFor(() => expect(screen.getByRole('alert')).not.toBeEmptyDOMElement())
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/already have a pending source-domain request/i)
    expect(screen.getByRole('dialog')).toContainElement(alert)
    // User is not trapped: dialog stays open and can be cancelled
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled()
  })

  it('focuses the rejection notice on open so screen readers read it', () => {
    render(
      <RequestSourceDialog
        open
        onOpenChange={onOpenChange}
        domain="makersmakingchange.com"
        notice="URL domain is not supported. Supported domains are: github.com"
      />
    )
    const notice = screen.getByText(/URL domain is not supported\. Supported domains are: github\.com/)
    expect(screen.getByRole('dialog')).toContainElement(notice)
    expect(notice).toHaveAttribute('role', 'alert')
    expect(notice).toHaveFocus()
  })

  it('shows a generic failure inside the dialog and allows retry', async () => {
    vi.spyOn(APIService, 'createUserRequest').mockRejectedValue(new Error('boom'))
    renderDialog()

    await submitWithReason()

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't submit your request for makersmakingchange\.com/i)
    expect(screen.getByRole('button', { name: /submit request/i })).toBeEnabled()
  })

  it('clears the error when a retry succeeds and closes the dialog', async () => {
    const spy = vi
      .spyOn(APIService, 'createUserRequest')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({} as Awaited<ReturnType<typeof APIService.createUserRequest>>)
    renderDialog()

    await submitWithReason()
    await waitFor(() => expect(screen.getByRole('alert')).not.toBeEmptyDOMElement())

    await userEvent.setup().click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
