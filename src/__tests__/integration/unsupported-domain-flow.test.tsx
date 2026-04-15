import { describe, it, expect } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import type { UserData, UserAccount } from '@/lib/types'

/**
 * Integration: Unsupported domain triggers request dialog using live backend.
 * Requires backend running at http://localhost:8002 (start with start-dev.sh).
 */
describeWithBackend('Unsupported domain flow (live backend)', () => {
  const user: UserData = {
    id: `test-user-${Date.now()}`,
    username: `u${Date.now()}`,
    avatarUrl: 'https://example.com/a.png',
  }

  const userAccount: UserAccount = {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: 'user',
  }

  it('opens request dialog on unsupported-domain event', async () => {
    const unsupportedDomain = `example-${Date.now()}.com`
    const unsupportedUrl = `https://${unsupportedDomain}/thing`
    const onLogin = () => {}
    const onLogout = () => {}

    render(
      <AuthProvider>
        <BrowserRouter>
          <AppHeader
            user={user}
            userAccount={userAccount}
            pendingRequestsCount={0}
            onLogin={onLogin}
            onLogout={onLogout}
            onProductCreated={() => {}}
          />
        </BrowserRouter>
      </AuthProvider>
    )

    // Ensure listeners are mounted before dispatching the event.
    await waitFor(() => {
      expect(screen.getByText('Submit Product')).toBeInTheDocument()
    })

    // Directly dispatch the event the ProductSubmission would emit after a blocked URL check
    window.dispatchEvent(new CustomEvent('unsupported-domain', {
      detail: { domain: unsupportedDomain, url: unsupportedUrl }
    }))

    // AppHeader listens to the event and should open the request dialog automatically
    const dialog = await screen.findByRole('dialog', { name: /Request New Source Domain/i }, { timeout: 10000 })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByDisplayValue(unsupportedDomain)).toBeInTheDocument()
  }, 15000)
})
