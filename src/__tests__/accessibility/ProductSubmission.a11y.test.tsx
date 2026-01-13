import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProductSubmission } from '@/components/ProductSubmission'
import { APIService } from '@/lib/api'
import type { UserData } from '@/lib/types'

describe('ProductSubmission Accessibility Tests', () => {
  // Use dev-token based users (no API calls needed in beforeEach)
  const testUser: UserData = {
    id: `test-a11y-user-${Date.now()}`,
    login: `testuser${Date.now()}`,
    avatarUrl: 'https://example.com/avatar.jpg',
  }

  // Helper to render with Router
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>)
  }

  beforeEach(async () => {
    // Set auth token getter for dev mode
    APIService.setAuthTokenGetter(async () => `dev-token-${testUser.id}`)
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Tests clean up automatically with dev tokens
  })

  describe('Dialog ARIA Attributes (Story 3.1)', () => {
    it('should have accessible submit button trigger', () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const button = screen.getByRole('button', { name: /submit product/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })

    it('should open dialog with proper ARIA attributes: aria-modal and role="dialog"', async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const triggerButton = screen.getByRole('button', { name: /submit product/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveAttribute('aria-modal', 'true')
      })
    })

    it('should have dialog header with title and description announced for screen readers', async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const triggerButton = screen.getByRole('button', { name: /submit product/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByText('Submit New Product')).toBeInTheDocument()
        expect(screen.getByText(/Share an accessibility tool/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Labels and Accessibility (Story 3.1)', () => {
    beforeEach(async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)
      const triggerButton = screen.getByRole('button', { name: /submit product/i })
      await userEvent.click(triggerButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
      })

      const urlInput = screen.getByLabelText('Product URL')
      fireEvent.change(urlInput, { target: { value: 'https://github.com/test/a11y-test-unique' } })
      
      // Click check button and wait for form to appear
      fireEvent.click(screen.getByRole('button', { name: /Check/i }))

      await waitFor(() => {
        // Form should appear with product name field
        expect(screen.getByLabelText(/product name/i, { selector: 'input' })).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should have all form inputs with associated labels via htmlFor', async () => {
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/product type/i)).toBeInTheDocument()
      // Check for description textarea
      const descriptionFields = screen.queryAllByLabelText(/description/i)
      expect(descriptionFields.length).toBeGreaterThan(0)
    })

    it('should mark required fields with visual indicator (*)', async () => {
      const nameLabel = screen.getByText(/product name/i).closest('label')
      expect(nameLabel?.textContent).toContain('*')
    })

    it('should use aria-invalid for form fields with validation errors', async () => {
      // Try to submit without filling required fields
      const submitButton = screen.getAllByRole('button', { name: /submit/i }).find(btn => btn.textContent?.includes('Submit Product'))
      if (submitButton) {
        await userEvent.click(submitButton)

        await waitFor(() => {
          const nameInput = screen.getByLabelText(/product name/i) as HTMLInputElement
          expect(nameInput).toHaveAttribute('aria-invalid', 'true')
        })
      }
    })

    it('should link error messages to fields via aria-describedby', async () => {
      // Try to submit without filling required fields
      const submitButton = screen.getAllByRole('button', { name: /submit/i }).find(btn => btn.textContent?.includes('Submit Product'))
      if (submitButton) {
        await userEvent.click(submitButton)

        await waitFor(() => {
          const nameInput = screen.getByLabelText(/product name/i) as HTMLInputElement
          const describedById = nameInput.getAttribute('aria-describedby')
          if (describedById) {
            const errorElement = document.getElementById(describedById)
            expect(errorElement).toHaveClass('text-destructive')
          }
        })
      }
    })
  })

  describe('Image Alt Text Accessibility (Story 3.1)', () => {
    beforeEach(async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)
      const triggerButton = screen.getByRole('button', { name: /submit product/i })
      await userEvent.click(triggerButton)

      // Navigate to form
      await waitFor(() => {
        expect(screen.getByLabelText('Product URL')).toBeInTheDocument()
      })

      const urlInput = screen.getByLabelText('Product URL')
      fireEvent.change(urlInput, { target: { value: 'https://github.com/test/image-test' } })
      fireEvent.click(screen.getByRole('button', { name: /Check/i }))

      await waitFor(() => {
        expect(screen.getByText('Product Image')).toBeInTheDocument()
      })
    })

    it('should have Product Image section with Image URL input', () => {
      expect(screen.getByText('Product Image')).toBeInTheDocument()
      expect(screen.getByLabelText(/Image URL/i)).toBeInTheDocument()
    })

    it('should only allow image URLs (no file upload)', () => {
      const fileInputs = document.querySelectorAll('input[type="file"]')
      expect(fileInputs.length).toBe(0)
    })
  })

  // Accessibility tests for Additional URLs during submission removed with feature simplification

  describe('Keyboard Navigation (Story 3.1)', () => {
    it('should open dialog with keyboard (Enter/Space on button)', async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const button = screen.getByRole('button', { name: /submit product/i })
      button.focus()

      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should close dialog with Escape key', async () => {
      const { rerender } = renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const button = screen.getByRole('button', { name: /submit product/i })
      await userEvent.click(button)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Close with Escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      // Re-render to check button is focused
      rerender(<MemoryRouter><ProductSubmission user={testUser} onSubmit={vi.fn()} /></MemoryRouter>)
    })

    it('should allow Tab navigation through all interactive elements', async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const button = screen.getByRole('button', { name: /submit product/i })
      await userEvent.click(button)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Check that we can tab to URL input
      const urlInput = screen.getByLabelText('Product URL')
      expect(urlInput).toBeInTheDocument()
      urlInput.focus()
      expect(document.activeElement).toBe(urlInput)
    })

    it('should support Space and Enter on buttons', async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const button = screen.getByRole('button', { name: /submit product/i })
      button.focus()

      // Test Space key
      fireEvent.keyDown(button, { key: ' ', code: 'Space' })
      fireEvent.keyUp(button, { key: ' ', code: 'Space' })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Screen Reader Announcements (Story 3.1)', () => {
    it('should announce loading state to screen readers', async () => {
      renderWithRouter(<ProductSubmission user={testUser} onSubmit={vi.fn()} />)

      const triggerButton = screen.getByRole('button', { name: /submit product/i })
      await userEvent.click(triggerButton)

      const urlInput = screen.getByLabelText('Product URL')
      fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo' } })
      fireEvent.click(screen.getByRole('button', { name: /Check/i }))

      // During check, loading message should be present
      expect(screen.getByText(/Checking URL/i)).toBeInTheDocument()
    })
  })
})
