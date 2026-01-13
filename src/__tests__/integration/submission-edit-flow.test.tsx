import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProductSubmission } from '@/components/ProductSubmission'
import { ProductDetail } from '@/components/ProductDetail'
import { APIService } from '@/lib/api'
import type { Product, UserData, UserAccount, Rating, Discussion, Collection } from '@/lib/types'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('Submission Dialog Edit Flow', () => {
  const ownerUser: UserData = {
    id: 'user-1',
    login: 'owner',
    avatarUrl: 'https://example.com/avatar.jpg',
  }

  const ownerAccount: UserAccount = {
    id: 'user-1',
    username: 'owner',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'user',
  }

  const nonOwnerUser: UserData = {
    id: 'user-2',
    login: 'nonowner',
    avatarUrl: 'https://example.com/avatar2.jpg',
  }

  const nonOwnerAccount: UserAccount = {
    id: 'user-2',
    username: 'nonowner',
    avatarUrl: 'https://example.com/avatar2.jpg',
    role: 'user',
  }

  const existingProduct: Product = {
    id: 'existing-product',
    slug: 'existing-product',
    name: 'Existing Product',
    type: 'Software',
    source: 'GitHub',
    sourceUrl: 'https://github.com/existing/repo',
    description: 'An existing product in the database',
    tags: ['existing'],
    ownerIds: ['user-1'],
    createdAt: Date.now(),
    origin: 'scraped-github',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(toast.success).mockReturnValue(1)

    // Mock loadUrl to return our existing product
    vi.spyOn(APIService, 'loadUrl').mockResolvedValue({
      success: true,
      source: 'database',
      product: existingProduct,
    })

    // Mock other necessary API methods
    vi.spyOn(APIService, 'createProduct').mockResolvedValue(existingProduct)
    vi.spyOn(APIService, 'createUserRequest').mockResolvedValue({} as any)
    vi.spyOn(APIService, 'getProductOwners').mockResolvedValue([])
    vi.spyOn(APIService, 'getUserRequests').mockResolvedValue([])
  })

  it('should navigate to product detail with edit=1 when owner clicks Edit button', async () => {
    let navigatedUrl = ''

    const TestApp = () => {
      return (
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
            <Route
              path="/product/:productId"
              element={
                <div>
                  <h1>Product Detail</h1>
                  <div>{window.location.href.includes('edit=1') && 'Edit Dialog Should Open'}</div>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      )
    }

    const { rerender } = render(<TestApp />)

    // Open submission dialog
    const submitBtn = screen.getByText('Submit Product')
    fireEvent.click(submitBtn)

    // Wait for URL input to be visible
    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    // Enter the product URL
    const urlInput = screen.getByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: existingProduct.sourceUrl } })

    // Click Check button
    fireEvent.click(screen.getByText('Check'))

    // Wait for product to be detected
    await waitFor(() => {
      expect(screen.getByText('Product Already Exists')).toBeInTheDocument()
    })

    // For owner, button should say "Edit product"
    const editBtn = screen.getByText('Edit product')
    expect(editBtn).toBeInTheDocument()

    // Click the Edit button
    fireEvent.click(editBtn)

    // Wait for navigation to occur
    await waitFor(() => {
      const url = window.location.href
      expect(url).toMatch(/\/product\/existing-product/)
      expect(url).toMatch(/edit=1/)
    })
  })

  it('should navigate to product detail with requestEdit=1 when non-owner clicks Request button', async () => {
    const mockOnRequestOwnership = vi.fn()

    const TestApp = () => {
      return (
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
            <Route
              path="/product/:productId"
              element={
                <div>
                  <h1>Product Detail</h1>
                  <div>
                    {window.location.href.includes('requestEdit=1') &&
                      'Request Form Should Open'}
                  </div>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      )
    }

    render(<TestApp />)

    // Open submission dialog
    const submitBtn = screen.getByText('Submit Product')
    fireEvent.click(submitBtn)

    // Wait for URL input
    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    // Enter the product URL
    const urlInput = screen.getByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: existingProduct.sourceUrl } })

    // Click Check button
    fireEvent.click(screen.getByText('Check'))

    // Wait for product to be detected
    await waitFor(() => {
      expect(screen.getByText('Product Already Exists')).toBeInTheDocument()
    })

    // For non-owner, button should say "Request to Edit Product"
    const requestBtn = screen.getByText('Request to Edit Product')
    expect(requestBtn).toBeInTheDocument()

    // Click the Request button
    fireEvent.click(requestBtn)

    // Verify request handler was called
    await waitFor(() => {
      expect(mockOnRequestOwnership).toHaveBeenCalledWith('existing-product')
    })

    // Wait for navigation
    await waitFor(() => {
      const url = window.location.href
      expect(url).toMatch(/\/product\/existing-product/)
      expect(url).toMatch(/requestEdit=1/)
    })
  })

  it('should close the submission dialog when button is clicked', async () => {
    const TestApp = () => {
      return (
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
    }

    render(<TestApp />)

    // Open submission dialog
    const submitBtn = screen.getByText('Submit Product')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    // Dialog should be open (URL input visible)
    expect(screen.getByLabelText('Product URL')).toBeInTheDocument()

    // Enter URL and check
    const urlInput = screen.getByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: existingProduct.sourceUrl } })
    fireEvent.click(screen.getByText('Check'))

    // Wait for Edit button
    await waitFor(() => {
      expect(screen.getByText('Edit product')).toBeInTheDocument()
    })

    // Click Edit button
    fireEvent.click(screen.getByText('Edit product'))

    // Dialog should close - URL input should not be visible anymore
    await waitFor(() => {
      expect(screen.queryByLabelText('Product URL')).not.toBeInTheDocument()
    })
  })

  it('should allow clicking the product card to navigate', async () => {
    const TestApp = () => {
      return (
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
    }

    render(<TestApp />)

    // Open submission dialog
    const submitBtn = screen.getByText('Submit Product')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
    })

    // Enter URL and check
    const urlInput = screen.getByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: existingProduct.sourceUrl } })
    fireEvent.click(screen.getByText('Check'))

    // Wait for product card to appear
    await waitFor(() => {
      expect(screen.getByText('Existing Product')).toBeInTheDocument()
    })

    // Click on the product card (it should be clickable)
    const productCard = screen.getByText('Existing Product').closest('div')
    if (productCard) {
      fireEvent.click(productCard)
    }

    // Should navigate (card doesn't have query params, just base URL)
    await waitFor(() => {
      const url = window.location.href
      expect(url).toMatch(/\/product\/existing-product/)
    })
  })
})
