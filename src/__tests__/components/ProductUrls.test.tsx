import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductUrls } from '../../components/ProductUrls'
import { APIService } from '../../lib/api'
import { DEV_USERS, getDevToken } from '../../lib/dev-users'
import { getValidProductType } from '../testData'

const API_BASE = (globalThis as any).__TEST_API_BASE__

describeWithBackend('ProductUrls Integration Tests', () => {
  let testProductId: string
  let testUserId: string
  let authHeader: { Authorization: string }

  const renderAndWaitForLoad = (props: { isEditor: boolean }) => {
    const view = render(<ProductUrls productId={testProductId} {...props} />)
    return waitFor(() => {
      expect(screen.queryByText('Loading URLs...')).not.toBeInTheDocument()
    }).then(() => view)
  }

  beforeEach(async () => {
    // Use the pre-seeded dev user instead of creating a dynamic one to avoid
    // hitting the dev row limit (users table is pre-filled by seed data).
    testUserId = DEV_USERS.user.id
    const userToken = getDevToken(DEV_USERS.user.role)
    authHeader = { Authorization: `Bearer ${userToken}` }
    APIService.setAuthTokenGetter(async () => userToken)

    // Create test product using APIService (handles snake_case conversion)
    const product = await APIService.createProduct({
      name: `Test Product ${Date.now()}`,
      type: getValidProductType('user-submitted'),
      source: 'user-submitted',
      category: 'Software',
      sourceUrl: `https://github.com/test/product-${Date.now()}`,
      editorIds: [testUserId],
    })
    
    testProductId = product.id

    // Ensure the test product starts with no URLs (some backends create one from source_url)
    try {
      const existingUrls = await APIService.getProductUrls(testProductId)
      await Promise.all(
        existingUrls.map((u) => APIService.deleteProductUrl(testProductId, u.id))
      )
    } catch (error) {
      // If cleanup fails, continue; tests will surface real failures
      console.warn('Failed to clean initial product URLs', error)
    }
  })

  afterEach(async () => {
    // Clean up product (URLs deleted automatically via cascade)
    if (testProductId) {
      try {
        const response = await fetch(`${API_BASE}/products/${testProductId}`, {
          method: 'DELETE',
          headers: authHeader,
        })

        if (!response.ok) {
          const details = await response.text().catch(() => '')
          console.warn(
            `[ProductUrls.test] Cleanup failed for product ${testProductId}: ${response.status} ${response.statusText} ${details}`
          )
        }
      } catch (error) {
        console.warn(
          `[ProductUrls.test] Cleanup request threw for product ${testProductId}:`,
          error
        )
      }
    }

    // Clean up test user — no-op since we use pre-seeded DEV_USERS.user
  })

  it('should load and display product URLs', async () => {
    // Add a test URL
    await APIService.addProductUrl(testProductId, {
      url: 'https://github.com/example/repo',
      description: 'Source code',
    })

    await renderAndWaitForLoad({ isEditor: true })

    await waitFor(() => {
      expect(screen.getByText('Source code')).toBeInTheDocument()
    })
  })

  it('should render URLs as clickable links', async () => {
    const testUrl = 'https://github.com/example/repo'

    await APIService.addProductUrl(testProductId, {
      url: testUrl,
      description: 'Test repo',
    })

    await renderAndWaitForLoad({ isEditor: true })

    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links.some(l => l.getAttribute('href') === testUrl)).toBe(true)
    })
  })

  it('should show empty state when no URLs exist', async () => {
    await renderAndWaitForLoad({ isEditor: false })

    await waitFor(() => {
      expect(screen.getByText(/No URLs added yet/)).toBeInTheDocument()
    })
  })

  it('should not show add button for non-owners', async () => {
    await renderAndWaitForLoad({ isEditor: false })

    await waitFor(() => {
      expect(screen.queryByText('Add URL')).not.toBeInTheDocument()
    })
  })

  it('should show add button for owners', async () => {
    await renderAndWaitForLoad({ isEditor: true })

    await waitFor(() => {
      expect(screen.getByText('Add URL')).toBeInTheDocument()
    })
  })

  it('should add new URL when form is submitted', async () => {
    const user = userEvent.setup()
    await renderAndWaitForLoad({ isEditor: true })

    // Click add button
    const addButton = await screen.findByText('Add URL')
    await user.click(addButton)

    // Fill form
    const urlInput = screen.getByPlaceholderText('https://example.com') as HTMLInputElement
    const descInput = screen.getByPlaceholderText(/Optional description/) as HTMLTextAreaElement

    await user.type(urlInput, 'https://example.com/new-resource')
    await user.type(descInput, 'New resource')

    // Submit form
    const submitButton = screen.getByText('Add URL', { selector: 'button[type="submit"]' })
    await user.click(submitButton)

    // Verify URL appears
    await waitFor(() => {
      expect(screen.getByText('New resource')).toBeInTheDocument()
    })
  })

  it('should clear form on cancel', async () => {
    const user = userEvent.setup()
    await renderAndWaitForLoad({ isEditor: true })

    const addButton = await screen.findByText('Add URL')
    await user.click(addButton)

    const urlInput = screen.getByPlaceholderText('https://example.com') as HTMLInputElement
    await user.type(urlInput, 'https://example.com')

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('https://example.com')).not.toBeInTheDocument()
    })
  })

  it('should delete URL when delete is clicked and confirmed', async () => {
    const user = userEvent.setup()

    // Add a URL
    const addRes = await fetch(`${API_BASE}/products/${testProductId}/urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        url: 'https://github.com/example/repo',
        description: 'Source code',
      }),
    })

    if (addRes.ok) {
      await renderAndWaitForLoad({ isEditor: true })

      await waitFor(() => {
        expect(screen.getByText('Source code')).toBeInTheDocument()
      })

      // Mock confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const deleteButton = await screen.findByLabelText('Delete URL')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.queryByText('Source code')).not.toBeInTheDocument()
      })

      confirmSpy.mockRestore()
    }
  })

  it('should display multiple URLs', async () => {
    // Add multiple URLs
    await APIService.addProductUrl(testProductId, {
      url: 'https://github.com/example/repo',
      description: 'Source code',
    })

    await APIService.addProductUrl(testProductId, {
      url: 'https://example.com/docs',
      description: 'Documentation',
    })

    await renderAndWaitForLoad({ isEditor: false })

    await waitFor(() => {
      expect(screen.getByText('Source code')).toBeInTheDocument()
      expect(screen.getByText('Documentation')).toBeInTheDocument()
    })
  })
})
