/**
 * Regression tests: handleEditProduct and handleAddTag must send UUID to
 * the backend PATCH endpoint, never a human-readable slug.
 *
 * The backend PATCH /api/products/{product_id} looks up by UUID primary key.
 * Sending a slug returns a 404 / silently fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { APIService } from '@/lib/api'
import type { Product, UserAccount } from '@/lib/types'
import { DEV_USERS } from '@/lib/dev-users'

vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>()
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  }
})

describe('updateProduct UUID enforcement', () => {
  const PRODUCT_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  const PRODUCT_SLUG = 'eating-utensil-grip'

  const testProduct: Product = {
    id: PRODUCT_UUID,
    slug: PRODUCT_SLUG,
    name: 'Eating Utensil Grip',
    type: 'Tool',
    source: 'user-submitted',
    sourceUrl: 'https://example.com/product',
    description: 'Original description that is long enough',
    tags: ['grip', 'utensil'],
    ownerIds: [DEV_USERS.admin.id],
    editorIds: [DEV_USERS.admin.id],
    createdAt: Date.now(),
    origin: 'user-submitted',
  }

  const adminAccount: UserAccount = {
    id: DEV_USERS.admin.id,
    username: DEV_USERS.admin.username,
    role: 'admin',
    avatarUrl: '',
  }

  function renderAppAtProductPage(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Auth
    vi.spyOn(APIService, 'getCurrentUser').mockResolvedValue(adminAccount)
    // Product listings
    vi.spyOn(APIService, 'getProductSources').mockResolvedValue([])
    vi.spyOn(APIService, 'getProductTypes').mockResolvedValue(['Tool', 'Software', 'Other'])
    vi.spyOn(APIService, 'getPopularTags').mockResolvedValue([])
    vi.spyOn(APIService, 'getFilteredTags').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllProducts').mockResolvedValue([testProduct])
    vi.spyOn(APIService, 'getProductCount').mockResolvedValue(1)
    vi.spyOn(APIService, 'getProductBySlug').mockResolvedValue(testProduct)
    // Ratings / discussions / blog
    vi.spyOn(APIService, 'getAllRatings').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllDiscussions').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
    // Collections / requests
    vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllPendingRequests').mockResolvedValue([])
    // Logging (non-critical)
    vi.spyOn(APIService, 'logUserActivity').mockResolvedValue({} as any)

    // THE KEY MOCK — what we assert on
    vi.spyOn(APIService, 'updateProduct').mockResolvedValue(testProduct)
  })

  it('handleEditProduct: calls APIService.updateProduct with UUID id, not slug', async () => {
    // Navigate to the product detail page with edit=1 so the dialog auto-opens
    renderAppAtProductPage(`/product/${PRODUCT_SLUG}?edit=1`)

    // Wait for the edit dialog to appear (it auto-opens because of edit=1)
    await waitFor(
      () => expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument(),
      { timeout: 5000 }
    )

    // Submit the edit form with unchanged (valid) data
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    // Verify updateProduct was called with the UUID, not the slug
    await waitFor(() => {
      expect(APIService.updateProduct).toHaveBeenCalled()
      const firstArg = vi.mocked(APIService.updateProduct).mock.calls[0][0]
      expect(firstArg).toBe(PRODUCT_UUID)
      expect(firstArg).not.toBe(PRODUCT_SLUG)
    })
  })

  it('handleAddTag: calls APIService.updateProduct with UUID id, not slug', async () => {
    renderAppAtProductPage(`/product/${PRODUCT_SLUG}`)

    // Wait for the product detail page to render
    await waitFor(
      () => expect(screen.getByText(testProduct.name)).toBeInTheDocument(),
      { timeout: 5000 }
    )

    // Click the "+" add-tag icon button to reveal the tag input form
    const addTagIconButton = screen.getByRole('button', { name: /Add tag/i })
    fireEvent.click(addTagIconButton)

    // Now the tag input should be visible
    const tagInput = await screen.findByPlaceholderText(/Enter tag name\(s\)/i)
    fireEvent.change(tagInput, { target: { value: 'new-tag' } })

    // Click "Add Tag" submit button
    fireEvent.click(screen.getByRole('button', { name: /^Add Tag$/i }))

    // Verify updateProduct was called with the UUID
    await waitFor(() => {
      expect(APIService.updateProduct).toHaveBeenCalled()
      const firstArg = vi.mocked(APIService.updateProduct).mock.calls[0][0]
      expect(firstArg).toBe(PRODUCT_UUID)
      expect(firstArg).not.toBe(PRODUCT_SLUG)
    })
  })
})
