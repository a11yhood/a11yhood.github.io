/**
 * Accessibility tests for NotFoundPage.
 * Ensures that any unmatched URL (e.g. /draft/211/) renders a page with
 * a level-one heading, satisfying the WCAG page-has-heading-one rule.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from '@/components/NotFoundPage'
import { runA11yScan } from '../helpers/a11y'

describe('NotFoundPage accessibility', () => {
  it('renders a level-one heading', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
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
