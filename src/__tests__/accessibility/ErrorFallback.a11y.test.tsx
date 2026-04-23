/**
 * Accessibility tests for the ErrorFallback component.
 * Ensures WCAG 2.1 compliance:
 * - All page content must be contained by landmarks (axe "region" rule).
 * - Page must contain a level-one heading (page-has-heading-one).
 * See: https://dequeuniversity.com/rules/axe/4.11/region
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorFallback } from '@/ErrorFallback'
import { runA11yScan } from '../helpers/a11y'

const mockError = new Error('URI Too Long')
const mockReset = () => {}

describe('ErrorFallback – landmark regions', () => {
  it('renders a main landmark so all content is contained by a landmark', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={mockReset} />)

    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders a level-one heading', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={mockReset} />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('has no obvious axe violations', async () => {
    const { container } = render(
      <ErrorFallback error={mockError} resetErrorBoundary={mockReset} />
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
