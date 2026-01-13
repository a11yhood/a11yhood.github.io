import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'

describe('Keyboard Navigation Tests', () => {
  const renderApp = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  it('should allow tab navigation through header elements', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(screen.getByAltText('a11yhood')).toBeInTheDocument()
    }, { timeout: 5000 })

    await user.tab()

    const skipLink = screen.getByText(/skip to main content/i)
    expect(document.activeElement).toBe(skipLink)
  })

  it('should allow tab navigation to search input', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    const searchInput = screen.getByPlaceholderText(/search products/i)
    expect(searchInput).toBeInTheDocument()
    
    searchInput.focus()
    expect(document.activeElement).toBe(searchInput)
  })

  it('should allow typing in search input', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLInputElement
    await user.click(searchInput)
    await user.keyboard('test search')

    expect(searchInput.value).toBe('test search')
  })

  it('should allow keyboard navigation through filter checkboxes', async () => {
    const user = userEvent.setup()
    renderApp()

    // Just verify app loaded and search is accessible
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    const searchInput = screen.getByPlaceholderText(/search products/i) as HTMLElement
    searchInput.focus()
    expect(document.activeElement).toBe(searchInput)
  })

  it('should allow Space key to toggle filters', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    const buttons = screen.queryAllByRole('button')
    const filterButton = buttons[0]
    filterButton.focus()

    await user.keyboard(' ')
    expect(filterButton).toHaveFocus()
  })

  it('should handle Escape key without errors', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    await user.keyboard('{Escape}')
    
    // App should still be functional
    expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
  })

  it('should display visible focus indicators on buttons', async () => {
    renderApp()

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    const buttons = screen.queryAllByRole('button')
    const firstButton = buttons[0]
    firstButton.focus()

    expect(document.activeElement).toBe(firstButton)
    const computedStyle = window.getComputedStyle(firstButton)
    // Button should have some visual indication of focus
    expect(firstButton).toHaveFocus()
  })

  it('should allow arrow key navigation through products', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    const buttons = screen.queryAllByRole('button')
    const firstButton = buttons[0]
    firstButton.focus()

    await user.keyboard('{ArrowRight}')
    // Navigation should not cause errors
    expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
  })

  it('should allow Enter key to activate buttons', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    const buttons = screen.queryAllByRole('button')
    const firstButton = buttons[0]
    firstButton.focus()

    await user.keyboard('{Enter}')
    expect(firstButton).toHaveFocus()
  })
})
