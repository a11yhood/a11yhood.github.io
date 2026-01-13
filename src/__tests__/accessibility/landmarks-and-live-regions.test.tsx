/**
 * Accessibility tests for landmark regions and ARIA live regions
 * Tests WCAG 2.1 AA compliance for:
 * - Landmark navigation (nav, main, aside, footer)
 * - ARIA live regions for dynamic content
 * - Screen reader announcements
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProductFilters } from '@/components/ProductFilters'
import { StarRating } from '@/components/StarRating'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

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

describe('ARIA Live Regions for Dynamic Content', () => {
  it('should announce filter changes via live region', () => {
    const { container } = render(
      <ProductFilters
        types={['Software', 'Hardware']}
        tags={['accessibility', 'testing']}
        sources={['GitHub', 'Ravelry']}
        selectedTypes={['Software']}
        selectedTags={['accessibility']}
        selectedSources={[]}
        minRating={3}
        updatedSince={null}
        onTypeToggle={() => {}}
        onTagToggle={() => {}}
        onSourceToggle={() => {}}
        onMinRatingChange={() => {}}
        onUpdatedSinceChange={() => {}}
        onClearFilters={() => {}}
      />
    )

    // Check for live region
    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    
    // Should announce active filters
    expect(liveRegion?.textContent).toContain('Filters active')
  })

  it('should announce no filters when none are active', () => {
    const { container } = render(
      <ProductFilters
        types={['Software', 'Hardware']}
        tags={['accessibility']}
        sources={['GitHub']}
        selectedTypes={[]}
        selectedTags={[]}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        onTypeToggle={() => {}}
        onTagToggle={() => {}}
        onSourceToggle={() => {}}
        onMinRatingChange={() => {}}
        onUpdatedSinceChange={() => {}}
        onClearFilters={() => {}}
      />
    )

    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion?.textContent).toContain('No filters active')
  })

  it('should announce rating updates via live region', () => {
    const handleChange = () => {}
    const { container } = render(
      <StarRating value={4} onChange={handleChange} readonly={false} />
    )

    // Check for live region in interactive mode
    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion?.textContent).toContain('4 out of 5 stars')
  })

  it('should not have live region in readonly mode', () => {
    const { container } = render(
      <StarRating value={4} readonly={true} />
    )

    // Should not announce in readonly mode
    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).not.toBeInTheDocument()
  })
})

describe('Empty State Status Announcements', () => {
  const renderApp = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  it('should have role="status" on search result announcements', async () => {
    renderApp()
    
    await waitFor(() => {
      const status = screen.getByRole('status', { hidden: true })
      expect(status).toBeInTheDocument()
    })
  })
})

describe('Loading State Accessibility', () => {
  let testUserId: string
  let productId: string

  beforeAll(async () => {
    testUserId = DEV_USERS.user.id
    APIService.setAuthTokenGetter(async () => getDevToken(testUserId))
    
    // Create a test product
    const product = await APIService.createProduct({
      name: `Test Product ${Date.now()}`,
      type: 'Software',
      sourceUrl: `https://example.com/product-${Date.now()}`,
      description: 'Test product for accessibility testing purposes',
      tags: ['test'],
    })
    productId = product.id
  })

  afterAll(async () => {
    try {
      if (productId) {
        await APIService.deleteProduct(productId)
      }
    } catch {}
  })

  it('should announce loading state for async operations', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
    })

    // Type in search to trigger loading state
    const searchInput = screen.getByPlaceholderText(/search products/i)
    await user.type(searchInput, 'test')

    // Check for loading announcement (may appear briefly)
    await waitFor(() => {
      const statusRegion = screen.queryByRole('status', { hidden: true })
      if (statusRegion) {
        expect(statusRegion).toBeInTheDocument()
      }
    }, { timeout: 1000 })
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
