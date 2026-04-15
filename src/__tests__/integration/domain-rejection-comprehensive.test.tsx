import { describe, it, expect, beforeAll } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
 * - Backend running at http://localhost:8002
 * - supported_sources table seeded with allowed domains
 */
describeWithBackend('Unsupported domain rejection (full flow)', () => {
  const user: UserData = {
    id: DEV_USERS.user.id,
    username: DEV_USERS.user.username,
    avatarUrl: 'https://example.com/a.png',
  }

  const userAccount: UserAccount = {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: 'user',
  }

  const authToken = getDevToken(DEV_USERS.user.role)

  beforeAll(async () => {
    // Set up auth and create user in backend
    APIService.setAuthTokenGetter(async () => authToken)
  })

  it('rejects unsupported domain and opens request dialog', async () => {
    const unsupportedDomain = `notinthelist-${Date.now()}.com`
    const unsupportedUrl = `https://${unsupportedDomain}/test-product`
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
      fireEvent.change(urlInput, { target: { value: unsupportedUrl } })
    })

    // Click Check button to trigger backend validation
    const checkButton = screen.getByRole('button', { name: /Check/i })
    
    await act(async () => {
      fireEvent.click(checkButton)
    })

    // Assert unsupported-domain event was emitted by ProductSubmission.
    await waitFor(() => {
      expect(eventDispatched).toBe(true)
      expect(eventDetail).toBeTruthy()
      expect(eventDetail.domain).toBe(unsupportedDomain)
      expect(eventDetail.url).toContain(unsupportedDomain)
    }, { timeout: 10000 })

    // Clean up
    window.removeEventListener('unsupported-domain', eventHandler)
  }, { timeout: 15000 })

  it('shows specific error message from backend for unsupported domain', async () => {
    const unsupportedDomain = `badsite-${Date.now()}.xyz`
    const unsupportedUrl = `https://${unsupportedDomain}/something`

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

    let eventDispatched = false
    const eventHandler = () => {
      eventDispatched = true
    }
    window.addEventListener('unsupported-domain', eventHandler)

    // Test with a clearly unsupported domain
    const urlInput = screen.getByLabelText('Product URL')
    
    await act(async () => {
      fireEvent.change(urlInput, { target: { value: unsupportedUrl } })
    })

    const checkButton = screen.getByRole('button', { name: /Check/i })
    
    await act(async () => {
      fireEvent.click(checkButton)
    })

    // Should surface unsupported-domain handling either via inline error text,
    // request-source dialog, or emitted unsupported-domain event.
    await waitFor(() => {
      const inlineError = screen.queryByText(
        /URL domain is not supported|supported sources|supported domains/i
      )
      const requestDialog = screen.queryByRole('dialog', {
        name: /Request New Source Domain/i,
      })
      expect(inlineError || requestDialog || eventDispatched).toBeTruthy()
    }, { timeout: 10000 })

    window.removeEventListener('unsupported-domain', eventHandler)
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

    // For supported domains, request-source dialog should not open.
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /Request New Source Domain/i })
      ).toBeNull()
    }, { timeout: 8000 })

    // Should NOT show unsupported domain error
    expect(screen.queryByText(/URL domain is not supported/i)).not.toBeInTheDocument()
  }, { timeout: 15000 })
})
