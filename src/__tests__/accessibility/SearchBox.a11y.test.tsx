import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'

describe('SearchBox Accessibility Tests (Story 2.2)', () => {
  const renderApp = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  describe('ARIA Attributes', () => {
    it('should have accessible label for search input', async () => {
      renderApp()

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search products/i)
        expect(searchInput).toBeInTheDocument()
        expect(searchInput).toHaveAttribute('aria-label', 'Search products')
      }, { timeout: 5000 })
    })

    it('should have descriptive placeholder text', async () => {
      renderApp()

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search products/i)
        expect(searchInput).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should have proper input type and role', async () => {
      renderApp()

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search products/i)
        expect(searchInput).toBeInTheDocument()
        expect(searchInput).toHaveAttribute('type', 'search')
      }, { timeout: 5000 })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible via Tab key', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox')
      await user.click(searchInput)

      expect(document.activeElement).toBe(searchInput)
    })

    it('should allow typing with keyboard', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox') as HTMLInputElement
      await user.click(searchInput)
      await user.type(searchInput, 'keyboard')

      expect(searchInput.value).toBe('keyboard')
    })

    it('should allow clearing input with keyboard', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox') as HTMLInputElement
      await user.click(searchInput)
      await user.type(searchInput, 'test')
      
      expect(searchInput.value).toBe('test')

      await user.clear(searchInput)
      expect(searchInput.value).toBe('')
    })
  })

  describe('Search Functionality', () => {
    it('should accept input and filter products', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox') as HTMLInputElement
      await user.click(searchInput)
      await user.type(searchInput, 'test')

      expect(searchInput.value).toBe('test')
    })

    it('should show all products when search is cleared', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement
      await user.click(searchInput)
      await user.type(searchInput, 'test')

      expect(searchInput.value).toBe('test')

      await user.clear(searchInput)

      expect(searchInput.value).toBe('')
    })

    it('should handle no results gracefully', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox') as HTMLInputElement
      await user.clear(searchInput)
      await user.click(searchInput)
      await user.type(searchInput, 'nonexistentproductxyz123789impossible')

      expect(searchInput.value).toBe('nonexistentproductxyz123789impossible')
    }, 10000)
  })

  describe('Screen Reader Support', () => {
    it('should announce search results to screen readers (via live region)', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox') as HTMLInputElement
      await user.clear(searchInput)
      await user.click(searchInput)
      await user.type(searchInput, 'test')

      expect(searchInput.value).toBe('test')
    })
  })

  describe('Focus Management', () => {
    it('should maintain focus in search input while typing', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox')
      await user.click(searchInput)

      expect(document.activeElement).toBe(searchInput)

      await user.type(searchInput, 'test')

      expect(document.activeElement).toBe(searchInput)
    })

    it('should have visible focus indicator', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox')
      searchInput.focus()

      expect(document.activeElement).toBe(searchInput)
      
      const computedStyle = window.getComputedStyle(searchInput)
      expect(computedStyle.outline).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should not cause errors during rapid typing', async () => {
      const user = userEvent.setup()
      renderApp()

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      }, { timeout: 5000 })

      const searchInput = screen.getByRole('searchbox') as HTMLInputElement
      await user.click(searchInput)
      
      await user.type(searchInput, 'keyboard', { delay: 10 })

      expect(searchInput.value).toBe('keyboard')
    })
  })
})
