/**
 * Accessibility tests for the About page.
 * Ensures WCAG 2.1 compliance: page must contain a level-one heading
 * (https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AboutPage } from '@/components/AboutPage'
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
