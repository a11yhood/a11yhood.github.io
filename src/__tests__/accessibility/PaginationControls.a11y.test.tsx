import { beforeAll, describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { APIService, setAuthTokenGetter } from '@/lib/api'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:8000/api'

const uniqueSuffix = `pagination-a11y-${Date.now()}`
const searchTerm = uniqueSuffix
let authToken: string

beforeAll(async () => {
  // Create a real user in the backend and use dev-token auth with retry logic
  const userId = `${uniqueSuffix}-user`
  let lastError: Error | null = null
  let user: any = null
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const userRes = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `pagination-${uniqueSuffix}`,
          email: `pagination-${uniqueSuffix}@example.com`,
        }),
      })

      if (userRes.ok) {
        user = await userRes.json()
        break
      }

      lastError = new Error(`Failed to create test user: ${userRes.status} ${userRes.statusText}`)
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
      }
    }
  }

  if (!user) {
    throw lastError || new Error('Failed to create test user after 3 attempts')
  }

  authToken = `dev-token-${user.id}`
  setAuthTokenGetter(async () => authToken)
})

describe('Pagination Accessibility (real backend data)', () => {
  const renderApp = () =>
    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )

  it('exposes accessible pagination controls', async () => {
    const user = userEvent.setup()
    renderApp()

    // Wait for search input to be available
    const searchInput = await screen.findByPlaceholderText(/search products/i, {}, { timeout: 5000 })
    expect(searchInput).toBeInTheDocument()
    
    // Pagination controls should exist (buttons with page size numbers)
    const pageSize30 = await screen.findByRole('button', { name: '30' }, { timeout: 5000 })
    expect(pageSize30).toBeInTheDocument()

  }, 10000)
})
