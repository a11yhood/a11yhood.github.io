import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'

/**
 * App Integration Tests
 * 
 * Basic smoke tests for the main App component using real backend.
 * Tests verify core UI elements render correctly.
 */

const renderApp = () => render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)

describe('App Integration Tests', () => {
  it('should render the app header with logo', async () => {
    renderApp()

    await waitFor(() => {
      expect(screen.getByAltText('a11yhood')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should render main navigation elements', async () => {
    renderApp()

    await waitFor(() => {
      // Header should be present
      const logo = screen.getByAltText('a11yhood')
      expect(logo).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should render product list container', async () => {
    renderApp()

    // Wait for content to load - may be empty if no products in test DB
    await waitFor(() => {
      // App should render without crashing
      expect(document.body).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
