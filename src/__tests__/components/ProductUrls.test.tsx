import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductUrls } from '../../components/ProductUrls'
import { APIService } from '../../lib/api'
import type { ProductUrl } from '../../types/product-url'

describe('ProductUrls mocked component tests', () => {
  let testProductId: string
  let mockUrls: ProductUrl[]

  const renderAndWaitForLoad = (props: { isEditor: boolean }) => {
    const view = render(<ProductUrls productId={testProductId} {...props} />)
    return waitFor(() => {
      expect(screen.queryByText('Loading URLs...')).not.toBeInTheDocument()
    }).then(() => view)
  }

  beforeEach(async () => {
    testProductId = 'test-product-id'
    mockUrls = []

    vi.spyOn(APIService, 'getProductUrls').mockImplementation(async () => [...mockUrls])
    vi.spyOn(APIService, 'addProductUrl').mockImplementation(async (productId, data) => {
      const next: ProductUrl = {
        id: `url-${mockUrls.length + 1}`,
        productId,
        url: data.url,
        description: data.description,
        createdAt: Date.now(),
      }
      mockUrls = [...mockUrls, next]
      return next
    })
    vi.spyOn(APIService, 'deleteProductUrl').mockImplementation(async (_productId, urlId) => {
      mockUrls = mockUrls.filter((u) => u.id !== urlId)
    })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
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

    await APIService.addProductUrl(testProductId, {
      url: 'https://github.com/example/repo',
      description: 'Source code',
    })

    await renderAndWaitForLoad({ isEditor: true })

    await waitFor(() => {
      expect(screen.getByText('Source code')).toBeInTheDocument()
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const deleteButton = await screen.findByLabelText('Delete URL')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.queryByText('Source code')).not.toBeInTheDocument()
    })

    confirmSpy.mockRestore()
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
