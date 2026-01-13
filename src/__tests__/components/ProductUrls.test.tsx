import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductUrls } from '../../components/ProductUrls'
import { APIService } from '../../lib/api'
import { getValidProductType } from '../testData'

const API_BASE = 'http://localhost:8000/api'

describe('ProductUrls Integration Tests', () => {
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
    // Create test user with retry logic
    const userId = `test-user-${Date.now()}`
    let lastError: Error | null = null
    let user: any = null
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const userRes = await fetch(`${API_BASE}/users/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: `testuser${Date.now()}`,
            email: `test${Date.now()}@example.com`,
          }),
        })

        if (userRes.ok) {
          user = await userRes.json()
          break
        }

        lastError = new Error(`Failed to create test user: ${userRes.statusText}`)
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

    testUserId = user.id
    authHeader = { Authorization: `dev-token-${testUserId}` }
    APIService.setAuthTokenGetter(async () => authHeader.Authorization)

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
    await fetch(`${API_BASE}/products/${testProductId}`, {
      method: 'DELETE',
      headers: authHeader,
    }).catch(() => {
      // Ignore cleanup errors
    })
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
