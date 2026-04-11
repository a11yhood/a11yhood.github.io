/**
 * Accessibility tests for the UserSignup page.
 * Ensures WCAG 2.1 compliance: page must contain a level-one heading
 * (https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserSignup } from '@/components/UserSignup'
import { runA11yScan } from '../helpers/a11y'

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  avatarUrl: '',
}

function renderUserSignup() {
  return render(
    <MemoryRouter>
      <UserSignup
        user={mockUser}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
      />
    </MemoryRouter>
  )
}

describe('UserSignup – level-one heading', () => {
  it('renders a level-one heading', () => {
    renderUserSignup()

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
    expect(h1).toHaveTextContent('Welcome to a11yhood!')
  })

  it('has no obvious axe violations', async () => {
    const { container } = renderUserSignup()

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
