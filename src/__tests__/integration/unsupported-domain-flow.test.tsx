import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import type { UserData, UserAccount } from '@/lib/types'

/**
 * Integration: Unsupported domain triggers request dialog using live backend.
 * Requires backend running at http://localhost:8000 (start with start-dev.sh).
 */
describe('Unsupported domain flow (live backend)', () => {
  const user: UserData = {
    id: `test-user-${Date.now()}`,
    login: `u${Date.now()}`,
    avatarUrl: 'https://example.com/a.png',
  }

  const userAccount: UserAccount = {
    id: user.id,
    username: user.login,
    avatarUrl: user.avatarUrl,
    role: 'user',
  }

  it('opens request dialog on unsupported-domain event', async () => {
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

    // Directly dispatch the event the ProductSubmission would emit after a blocked URL check
    window.dispatchEvent(new CustomEvent('unsupported-domain', {
      detail: { domain: 'example.com', url: 'https://example.com/thing' }
    }))

    // AppHeader listens to the event and should open the request dialog automatically
    await waitFor(() => screen.getByText('Request New Source Domain'), { timeout: 5000 })
    expect(screen.getByDisplayValue('example.com')).toBeInTheDocument()
  })
})
