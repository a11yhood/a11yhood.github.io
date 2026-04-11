/**
 * Accessibility tests for the About page.
 * Ensures WCAG 2.1 compliance:
 * - Page must contain a level-one heading (page-has-heading-one).
 * - Page must have exactly one main landmark (landmark-one-main).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AboutPage } from '@/components/AboutPage'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { runA11yScan } from '../helpers/a11y'

describe('AboutPage – level-one heading (page-has-heading-one)', () => {
  it('renders a level-one heading', () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: /about a11yhood/i })).toBeInTheDocument()
  })

  it('has no obvious axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})

describe('AboutPage – landmark-one-main (within full App)', () => {
  it('has exactly one main landmark when rendered inside App', async () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
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
