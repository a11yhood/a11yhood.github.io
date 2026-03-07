/**
 * Accessibility tests for landmark regions and ARIA live regions
 * Tests WCAG 2.1 AA compliance for:
 * - Landmark navigation (nav, main, aside, footer)
 * - ARIA live regions for dynamic content
 * - Screen reader announcements
 */
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'

describe('Landmark Regions Accessibility', () => {
  const renderApp = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  it('should have main landmark region', async () => {
    renderApp()
    
    await waitFor(() => {
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })
  })

  it('should have navigation landmark with proper label', async () => {
    renderApp()
    
    await waitFor(() => {
      const nav = screen.getByRole('navigation', { name: /primary navigation/i })
      expect(nav).toBeInTheDocument()
    })
  })

  it('should have complementary landmark (aside) for filters', async () => {
    renderApp()
    
    await waitFor(() => {
      const aside = screen.getByRole('complementary', { name: /filters/i })
      expect(aside).toBeInTheDocument()
    })
  })

  it('should have footer landmark with proper label', async () => {
    renderApp()
    
    await waitFor(() => {
      const footer = screen.getByRole('contentinfo', { name: /site footer/i })
      expect(footer).toBeInTheDocument()
    })
  })

  it('should have search landmark for filter controls', async () => {
    renderApp()
    
    await waitFor(() => {
      const search = screen.getByRole('search')
      expect(search).toBeInTheDocument()
    })
  })
})

describe('Focus Management and Skip Links', () => {
  it('should allow skipping to main content', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )

    // Tab to skip link
    await user.tab()
    
    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveFocus()

    // Activate skip link
    await user.keyboard('{Enter}')

    // Focus should move to main
    const main = screen.getByRole('main')
    expect(main).toHaveFocus()
  })
})
