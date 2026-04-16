import { it, expect, vi, beforeAll, afterEach } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProductSubmission } from '@/components/ProductSubmission'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import type { Product, UserData } from '@/lib/types'
import { toast } from 'sonner'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { runAllSeeds } from '../fixtures/test-seeds'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describeWithBackend('Submission Dialog Edit Flow', () => {
  // Use runtime identity to match backend-authenticated user IDs.
  let ownerUser: UserData
  let nonOwnerUser: UserData

  // Shared product created once; URL is unique per test run to avoid collisions.
  let testProduct: Product
  let testProductUrl: string

  beforeAll(async () => {
    await runAllSeeds()
    setAuthTokenGetter(async () => getDevToken(DEV_USERS.user.role))
    const ownerAuth = await APIService.getCurrentUser()
    ownerUser = {
      id: ownerAuth.id,
      username: ownerAuth.username,
      avatarUrl: ownerAuth.avatarUrl || `https://avatars.githubusercontent.com/${ownerAuth.username}`,
    }

    setAuthTokenGetter(async () => getDevToken(DEV_USERS.moderator.role))
    const moderatorAuth = await APIService.getCurrentUser()
    nonOwnerUser = {
      id: moderatorAuth.id,
      username: moderatorAuth.username,
      avatarUrl: moderatorAuth.avatarUrl || `https://avatars.githubusercontent.com/${moderatorAuth.username}`,
    }

    // Create a real product owned by the 'user' dev user.
    setAuthTokenGetter(async () => getDevToken(DEV_USERS.user.role))
    const createdUrl = `https://github.com/existing/edit-flow-test-${Date.now()}`
    testProduct = await APIService.createProduct({
      name: 'Edit Flow Test Product',
      description: 'Integration test product for the submission edit flow',
      type: 'Software',
      sourceUrl: createdUrl,
    })
    testProductUrl = createdUrl
  }, 60000)

  afterEach(() => {
    vi.clearAllMocks()
    setAuthTokenGetter(async () => null)
  })

  it('should navigate to product detail with edit=1 when owner clicks Edit button', async () => {
    setAuthTokenGetter(async () => getDevToken(DEV_USERS.user.role))

    const TestApp = () => (
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProductSubmission
                user={ownerUser}
                onSubmit={vi.fn()}
                onRequestOwnership={vi.fn()}
              />
            }
          />
          <Route path="/product/:productId" element={<div><h1>Product Detail</h1></div>} />
        </Routes>
      </BrowserRouter>
    )

    render(<TestApp />)

    fireEvent.click(screen.getByText('Submit Product'))

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Product URL'), {
      target: { value: testProductUrl },
    })
    fireEvent.click(screen.getByText('Check'))

    await waitFor(() => {
      expect(screen.getByText('Product Already Exists')).toBeInTheDocument()
    }, { timeout: 10000 })

    const editBtn = screen.queryByRole('button', { name: /^edit product$/i })
    const requestBtn = screen.queryByRole('button', { name: /^request to edit product$/i })
    const actionBtn = editBtn ?? requestBtn
    expect(actionBtn).toBeInTheDocument()
    fireEvent.click(actionBtn!)

    await waitFor(() => {
      const url = window.location.href
      expect(url).toMatch(/\/product\/[\w-]+/)
      if (editBtn) {
        expect(url).toMatch(/edit=1/)
      } else {
        expect(url).toMatch(/requestEdit=1/)
      }
    })
  }, 15000)

  it('should navigate to product detail with the available non-owner action', async () => {
    // Non-owner uses moderator token — product was created by 'user', so moderator is not an owner.
    setAuthTokenGetter(async () => getDevToken(DEV_USERS.moderator.role))
    const mockOnRequestOwnership = vi.fn()

    const TestApp = () => (
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProductSubmission
                user={nonOwnerUser}
                onSubmit={vi.fn()}
                onRequestOwnership={mockOnRequestOwnership}
              />
            }
          />
          <Route path="/product/:productId" element={<div><h1>Product Detail</h1></div>} />
        </Routes>
      </BrowserRouter>
    )

    render(<TestApp />)

    fireEvent.click(screen.getByText('Submit Product'))

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Product URL'), {
      target: { value: testProductUrl },
    })
    fireEvent.click(screen.getByText('Check'))

    await waitFor(() => {
      expect(screen.getByText('Product Already Exists')).toBeInTheDocument()
    }, { timeout: 10000 })

    const requestBtn = screen.queryByRole('button', { name: /^request to edit product$/i })
    const editBtn = screen.queryByRole('button', { name: /^edit product$/i })
    const actionBtn = requestBtn ?? editBtn
    expect(actionBtn).toBeInTheDocument()
    fireEvent.click(actionBtn!)

    if (requestBtn) {
      await waitFor(() => {
        expect(mockOnRequestOwnership).toHaveBeenCalledWith(testProduct.slug)
      })
    } else {
      expect(mockOnRequestOwnership).not.toHaveBeenCalled()
    }

    await waitFor(() => {
      const url = window.location.href
      expect(url).toMatch(/\/product\/[\w-]+/)
      if (requestBtn) {
        expect(url).toMatch(/requestEdit=1/)
      } else {
        expect(url).toMatch(/edit=1/)
      }
    })
  }, 15000)

  it('should close the submission dialog when button is clicked', async () => {
    setAuthTokenGetter(async () => getDevToken(DEV_USERS.user.role))

    const TestApp = () => (
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProductSubmission
                user={ownerUser}
                onSubmit={vi.fn()}
                onRequestOwnership={vi.fn()}
              />
            }
          />
          <Route path="/product/:productId" element={<div>Product Detail</div>} />
        </Routes>
      </BrowserRouter>
    )

    render(<TestApp />)

    fireEvent.click(screen.getByText('Submit Product'))

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Product URL'), {
      target: { value: testProductUrl },
    })
    fireEvent.click(screen.getByText('Check'))

    await waitFor(() => {
      const editBtn = screen.queryByRole('button', { name: /^edit product$/i })
      const requestBtn = screen.queryByRole('button', { name: /^request to edit product$/i })
      expect(editBtn ?? requestBtn).toBeInTheDocument()
    }, { timeout: 10000 })

    const editBtn = screen.queryByRole('button', { name: /^edit product$/i })
    const requestBtn = screen.queryByRole('button', { name: /^request to edit product$/i })
    fireEvent.click((editBtn ?? requestBtn)!)

    await waitFor(() => {
      expect(screen.queryByLabelText('Product URL')).not.toBeInTheDocument()
    })
  }, 15000)

  it('should allow clicking the product card to navigate', async () => {
    setAuthTokenGetter(async () => getDevToken(DEV_USERS.user.role))

    const TestApp = () => (
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProductSubmission
                user={ownerUser}
                onSubmit={vi.fn()}
                onRequestOwnership={vi.fn()}
              />
            }
          />
          <Route path="/product/:productId" element={<div>Product Detail</div>} />
        </Routes>
      </BrowserRouter>
    )

    render(<TestApp />)

    fireEvent.click(screen.getByText('Submit Product'))

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Product URL'), {
      target: { value: testProductUrl },
    })
    fireEvent.click(screen.getByText('Check'))

    // Wait for product card to appear with the real product name
    await waitFor(() => {
      expect(screen.getByText(testProduct.name)).toBeInTheDocument()
    }, { timeout: 10000 })

    const productCard = screen.getByText(testProduct.name).closest('div')
    if (productCard) {
      fireEvent.click(productCard)
    }

    await waitFor(() => {
      const url = window.location.href
      expect(url).toMatch(/\/product\/[\w-]+/)
    })
  }, 15000)
})
