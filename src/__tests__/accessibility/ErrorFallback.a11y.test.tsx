/**
 * Accessibility tests for the ErrorFallback component.
 * Ensures WCAG 2.1 compliance:
 * - All page content must be contained by landmarks (axe "region" rule).
 * - Page must contain a level-one heading (page-has-heading-one).
 * See: https://dequeuniversity.com/rules/axe/4.11/region
 *
 * ErrorFallback replaces the entire page when the React error boundary fires,
 * so it must independently satisfy landmark and heading requirements.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorFallback } from '@/ErrorFallback'
import { runA11yScan } from '../helpers/a11y'

const mockError = new Error('URI Too Long')
const noop = () => {}

describe('ErrorFallback – landmark-one-main', () => {
  it('renders exactly one main landmark', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={noop} />)

    const mains = document.querySelectorAll('main')
    expect(mains.length).toBe(1)
  })

  it('main landmark is present via getByRole', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={noop} />)

    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})

describe('ErrorFallback – page-has-heading-one', () => {
  it('renders a level-one heading', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={noop} />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})

describe('ErrorFallback – axe scan', () => {
  it('has no obvious axe violations', async () => {
    const { container } = render(
      <ErrorFallback error={mockError} resetErrorBoundary={noop} />
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
