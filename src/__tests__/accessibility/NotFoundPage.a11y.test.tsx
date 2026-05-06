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
  it('has exactly one main landmark when rendered inside App on an unmatched route', () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    // There must be exactly one <main> element in the document
    const mains = document.querySelectorAll('main')
    expect(mains.length).toBe(1)
  })
})
