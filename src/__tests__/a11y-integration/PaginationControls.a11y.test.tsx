import { beforeAll, describe, it, expect, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

beforeAll(async () => {
  if (!(globalThis as any).__BACKEND_AVAILABLE__) return

  vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
  APIService.setAuthTokenGetter(async () => getDevToken(DEV_USERS.user.role))
  await APIService.createProduct({
    name: `Pagination Visibility Product ${Date.now()}`,
    description: 'Product used to ensure the list toolbar renders during pagination accessibility tests.',
    type: 'Software',
    sourceUrl: `https://github.com/test/pagination-${Date.now()}`,
    tags: ['featured'],
  })
})

describeWithBackend('Pagination Accessibility (real backend data)', () => {
  const renderApp = () =>
    render(
      <MemoryRouter initialEntries={['/products']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

  it('exposes accessible pagination controls', async () => {
    renderApp()

    // Wait for search input to be available
    const searchInput = await screen.findByPlaceholderText(/search products/i, {}, { timeout: 5000 })
    expect(searchInput).toBeInTheDocument()
    
    // Pagination controls should exist (buttons with page size numbers)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '30' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument()
    }, { timeout: 5000 })

  }, 10000)

  it.todo('navigates to page 2 when enough products exist (requires backend dev row limit >= 40 to exceed smallest page size of 30)')
})
