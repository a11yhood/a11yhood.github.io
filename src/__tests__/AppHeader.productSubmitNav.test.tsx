import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { APIService } from '@/lib/api'
import type { UserData, UserAccount } from '@/lib/types'

vi.mock('@/components/ProductSubmission', () => ({
  ProductSubmission: ({ onSubmit }: { onSubmit: (productData: unknown) => Promise<void> | void }) => (
    <button
      type="button"
      onClick={() => {
        void onSubmit({
          name: 'New Product',
          type: 'Software',
          sourceUrl: 'https://example.com/new-product',
          source: 'user-submitted',
          description: 'A newly submitted accessible product description.',
          tags: [],
        })
      }}
    >
      Mock Submit Product
    </button>
  ),
}))

describe('AppHeader product submission navigation', () => {
  beforeEach(() => {
    vi.spyOn(APIService, 'createProduct').mockResolvedValue({
      id: 'product-1',
      slug: 'new-product',
      name: 'New Product',
      type: 'Software',
      sourceUrl: 'https://example.com/new-product',
      source: 'user-submitted',
      description: 'A newly submitted accessible product description.',
      tags: [],
      createdAt: Date.now(),
    } as any)
    vi.spyOn(APIService, 'logUserActivity').mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates to the new product detail page after submit', async () => {
    const user = { id: 'u1', username: 'alice', avatarUrl: undefined } as UserData
    const userAccount = { id: 'u1', username: 'alice', role: 'user' } as UserAccount

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <AppHeader
                user={user}
                userAccount={userAccount}
                pendingRequestsCount={0}
                onLogin={() => {}}
                onLogout={() => {}}
              />
            )}
          />
          <Route path="/product/:slug" element={<div>Product Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    )
    const testUser = userEvent.setup()

    await testUser.click(screen.getByRole('button', { name: /mock submit product/i }))

    await waitFor(() => {
      expect(APIService.createProduct).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Product Detail Page')).toBeInTheDocument()
    })
  })
})
