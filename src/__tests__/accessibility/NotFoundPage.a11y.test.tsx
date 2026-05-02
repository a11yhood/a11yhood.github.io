/**
 * Accessibility tests for the Not Found (404) page.
 * Ensures WCAG 2.1 compliance:
 * - Page must contain a level-one heading (page-has-heading-one).
 * - Page must have exactly one main landmark (landmark-one-main).
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

describe('NotFoundPage – landmark-one-main (within full App)', () => {
  /**
   * Regression test for https://dequeuniversity.com/rules/axe/4.11/landmark-one-main
   * Ensures unmatched routes always render exactly one <main> landmark.
   * Previously, the SPA redirect (404.html) could produce a URI-Too-Long (414) error
   * page with no <main> when the redirect URL exceeded server limits.
   */
  it('has exactly one main landmark on unmatched routes', () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    const mains = document.querySelectorAll('main')
    expect(mains.length).toBe(1)
  })

  it('main landmark is accessible via getByRole on unmatched routes', () => {
    render(
      <MemoryRouter initialEntries={['/another-missing-route']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
