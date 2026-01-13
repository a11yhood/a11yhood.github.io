import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import type { UserData, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

/**
 * Comprehensive integration test for unsupported domain rejection.
 * Tests the full flow from URL entry → backend validation → error → dialog opening.
 * 
 * Requires:
 * - Backend running at http://localhost:8000
 * - supported_sources table seeded with allowed domains
 */
describe('Unsupported domain rejection (full flow)', () => {
  const user: UserData = {
    id: DEV_USERS.user.id,
    login: DEV_USERS.user.login,
    avatarUrl: 'https://example.com/a.png',
  }

  const userAccount: UserAccount = {
    id: user.id,
    username: user.login,
    avatarUrl: user.avatarUrl,
    role: 'user',
  }

  const authToken = getDevToken(user.id)

  beforeAll(async () => {
    // Set up auth and create user in backend
    APIService.setAuthTokenGetter(async () => authToken)
  })

  it('rejects unsupported domain and opens request dialog', async () => {
    const onLogin = () => {}
    const onLogout = () => {}

    // Track if unsupported-domain event is dispatched
    let eventDispatched = false
    let eventDetail: any = null
    const eventHandler = (e: Event) => {
      eventDispatched = true
      eventDetail = (e as CustomEvent).detail
    }
    window.addEventListener('unsupported-domain', eventHandler)

    const { container } = render(
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

    // Open ProductSubmission dialog
    const submitButton = screen.getByText('Submit Product')
    fireEvent.click(submitButton)

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    // Enter an unsupported domain (notinthelist.com not in supported_sources)
    const urlInput = screen.getByLabelText('Product URL')
    
    await act(async () => {
      fireEvent.change(urlInput, { target: { value: 'https://notinthelist.com/test-product' } })
    })

    // Click Check button to trigger backend validation
    const checkButton = screen.getByRole('button', { name: /Check/i })
    
    await act(async () => {
      fireEvent.click(checkButton)
    })

    // Wait for backend to respond with unsupported domain error
    await waitFor(async () => {
      // Error should be shown in the UI (message can vary if supported sources change)
      const errorText = await screen.findByText(
        (content) =>
          content.includes('URL domain is not supported') &&
          content.toLowerCase().includes('supported domains are'),
        { timeout: 5000 }
      )
      expect(errorText).toBeTruthy()
    }, { timeout: 6000 })

    // Verify that the unsupported-domain event was dispatched
    await waitFor(() => {
      expect(eventDispatched).toBe(true)
      expect(eventDetail).toBeTruthy()
      expect(eventDetail.domain).toBe('notinthelist.com')
      expect(eventDetail.url).toContain('notinthelist.com')
    }, { timeout: 2000 })

    // AppHeader should listen to the event and open RequestSourceDialog
    await waitFor(async () => {
      const dialog = await screen.findByText('Request New Source Domain', {}, { timeout: 3000 })
      expect(dialog).toBeInTheDocument()
    }, { timeout: 4000 })

    // Verify the dialog has the domain prefilled
    const domainInput = screen.getByDisplayValue('notinthelist.com')
    expect(domainInput).toBeInTheDocument()

    // Clean up
    window.removeEventListener('unsupported-domain', eventHandler)
  }, { timeout: 15000 })

  it('shows specific error message from backend for unsupported domain', async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <AppHeader
            user={user}
            userAccount={userAccount}
            pendingRequestsCount={0}
            onLogin={() => {}}
            onLogout={() => {}}
            onProductCreated={() => {}}
          />
        </BrowserRouter>
      </AuthProvider>
    )

    // Open dialog
    fireEvent.click(screen.getByText('Submit Product'))

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    // Test with a clearly unsupported domain
    const urlInput = screen.getByLabelText('Product URL')
    
    await act(async () => {
      fireEvent.change(urlInput, { target: { value: 'https://badsite.xyz/something' } })
    })

    const checkButton = screen.getByRole('button', { name: /Check/i })
    
    await act(async () => {
      fireEvent.click(checkButton)
    })

    // Should show error mentioning supported domains or configuration
    await waitFor(async () => {
      const error = await screen.findByText(
        /URL domain is not supported|supported sources|supported domains/i,
        {},
        { timeout: 5000 }
      )
      expect(error).toBeTruthy()
    }, { timeout: 6000 })
  }, { timeout: 15000 })

  it('allows supported domains to proceed', async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <AppHeader
            user={user}
            userAccount={userAccount}
            pendingRequestsCount={0}
            onLogin={() => {}}
            onLogout={() => {}}
            onProductCreated={() => {}}
          />
        </BrowserRouter>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('Submit Product'))

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    // Use a supported domain (github.com should be in supported_sources)
    const urlInput = screen.getByLabelText('Product URL')
    const uniqueGithubUrl = `https://github.com/test/repo-${Date.now()}`
    
    await act(async () => {
      fireEvent.change(urlInput, { target: { value: uniqueGithubUrl } })
    })

    const checkButton = screen.getByRole('button', { name: /Check/i })
    
    await act(async () => {
      fireEvent.click(checkButton)
    })

    // Should proceed to manual form (since product doesn't exist and scraping may fail)
    await waitFor(async () => {
      const nameInput = await screen.findByLabelText(/Product Name/i, {}, { timeout: 5000 })
      expect(nameInput).toBeInTheDocument()
    }, { timeout: 6000 })

    // Should NOT show unsupported domain error
    expect(screen.queryByText(/URL domain is not supported/i)).not.toBeInTheDocument()
  }, { timeout: 15000 })
})
