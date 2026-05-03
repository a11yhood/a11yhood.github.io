import { beforeAll, describe, it, expect, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

const MIN_PRODUCTS_FOR_SECOND_PAGE = 31

async function ensureProductsForPagination(): Promise<void> {
  const currentCount = await APIService.getProductCount()
  const missingProducts = Math.max(0, MIN_PRODUCTS_FOR_SECOND_PAGE - currentCount)

  const base = Date.now()
  // Swallow row-cap errors — if the backend is already at the limit we have
  // enough products for page 2 to exist, so the test can proceed.
  await Promise.allSettled(
    Array.from({ length: missingProducts }, (_, index) => {
      const suffix = `${base}-${index}`
      return APIService.createProduct({
        name: `Pagination Control Product ${suffix}`,
        description: 'Product used to ensure page 2 exists for pagination accessibility tests.',
        type: 'Software',
        sourceUrl: `https://github.com/test/pagination-control-${suffix}`,
        tags: ['featured'],
      })
    })
  )
}

beforeAll(async () => {
  if (!(globalThis as any).__BACKEND_AVAILABLE__) return

  vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
  APIService.setAuthTokenGetter(async () => getDevToken(DEV_USERS.user.role))
  await ensureProductsForPagination()
}, 60000)

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

  it('navigates to page 2 when enough products exist', async () => {
    renderApp()

    await screen.findByPlaceholderText(/search products/i, {}, { timeout: 10000 })
    await waitFor(() => {
      expect(screen.getAllByText(/Showing\s+\d+-\d+\s+of\s+\d+/i).length).toBeGreaterThan(0)
    }, { timeout: 30000 })

    const pageSize30Button = await screen.findByRole('button', { name: '30' }, { timeout: 10000 })
    fireEvent.click(pageSize30Button)

    const nextPageButton = await screen.findByRole('button', { name: /next page/i }, { timeout: 30000 })
    expect(nextPageButton).toBeInTheDocument()
    expect(nextPageButton).toBeEnabled()

    fireEvent.click(nextPageButton)

    await waitFor(() => {
      expect(screen.getByText(/Page 2\s*\/\s*\d+/i)).toBeInTheDocument()
    }, { timeout: 10000 })
  }, 45000)
})
