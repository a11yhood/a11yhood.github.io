/**
 * Accessibility tests for the Not Found (404) page.
 * Ensures WCAG 2.1 compliance: page must contain a level-one heading
 * (https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one).
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
