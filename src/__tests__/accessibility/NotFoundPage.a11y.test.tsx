/**
 * Accessibility tests for the Not Found (404) page.
 * Ensures WCAG 2.1 compliance:
 * - Page must contain a level-one heading (page-has-heading-one).
 * - All page content must be contained by landmarks (region rule).
 *   See https://dequeuniversity.com/rules/axe/4.11/region
 *
 * The "region" rule was previously violated by a bare GitHub Pages 414 error
 * page (triggered when the SPA redirect URL grew too long).  The guard in
 * public/404.html now prevents that scenario; these tests verify that the
 * React-rendered NotFoundPage route always satisfies the rule inside the App.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from '@/components/NotFoundPage'
import { runA11yScan } from '../helpers/a11y'
import { AuthProvider } from '@/contexts/AuthContext'
import App from '@/App'

describe('NotFoundPage – level-one heading', () => {
  const renderAtPath = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

  it('renders a level-one heading for the standalone NotFoundPage', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders an <h1> on any other unmatched route', () => {
    renderAtPath('/this-route-does-not-exist')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it('has no obvious axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})

describe('NotFoundPage – landmark region (axe region rule)', () => {
  /**
   * Verifies that the NotFoundPage content is contained inside the App's
   * <main> landmark, satisfying the axe "region" rule:
   * https://dequeuniversity.com/rules/axe/4.11/region
   */
  it('NotFoundPage content is inside the main landmark when rendered via App', () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()

    // The "Page Not Found" heading must be a descendant of <main>
    const heading = screen.getByRole('heading', { level: 1, name: /page not found/i })
    expect(main.contains(heading)).toBe(true)
  })

  it('has no axe violations for unmatched route rendered inside App', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
