/**
 * Accessibility tests for the UserSignup component.
 * Ensures WCAG 2.1 compliance:
 * - Page must contain a level-one heading (page-has-heading-one).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserSignup } from '@/components/UserSignup'
import { runA11yScan } from '../helpers/a11y'

const defaultProps = {
  user: { id: 'user-1', username: 'testuser', avatarUrl: '' },
  onComplete: vi.fn(),
  onSkip: vi.fn(),
}

describe('UserSignup – level-one heading (page-has-heading-one)', () => {
  it('renders a level-one heading', () => {
    render(
      <MemoryRouter>
        <UserSignup {...defaultProps} />
      </MemoryRouter>
    )

    expect(
      screen.getByRole('heading', { level: 1, name: /welcome to a11yhood/i })
    ).toBeInTheDocument()
  })

  it('has no obvious axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <UserSignup {...defaultProps} />
      </MemoryRouter>
    )

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
