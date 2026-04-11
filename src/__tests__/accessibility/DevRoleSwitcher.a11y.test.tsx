/**
 * Accessibility tests for DevRoleSwitcher
 * Ensures the dev role switcher widget is contained within a landmark region
 * so all page content is within landmarks (WCAG 2.1 region rule).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import { runA11yScan } from '../helpers/a11y'
import type { UserAccount } from '@/lib/types'

const regularAccount: UserAccount = {
  id: '2a3b7c3e-971b-4b42-9c8c-0f1843486c50',
  username: 'regular_user',
  role: 'user',
}

beforeEach(() => {
  localStorage.clear()
})

describe('DevRoleSwitcher landmark region', () => {
  it('renders inside a complementary (aside) landmark when expanded', () => {
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    // The component must be wrapped in a complementary landmark so all page
    // content is contained by landmarks (WCAG 2.1 region rule).
    const landmark = screen.getByRole('complementary', { name: /dev role switcher/i })
    expect(landmark).toBeInTheDocument()
  })

  it('renders inside a complementary (aside) landmark when collapsed', async () => {
    const user = userEvent.setup()
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    // Collapse the switcher
    const hideButton = screen.getByRole('button', { name: /collapse dev role switcher/i })
    await user.click(hideButton)

    // The collapsed state (icon-only button) must still be inside a landmark
    const landmark = screen.getByRole('complementary', { name: /dev role switcher/i })
    expect(landmark).toBeInTheDocument()
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  it('has no axe violations when collapsed (icon button only)', async () => {
    const user = userEvent.setup()
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    // Collapse to icon button — simpler DOM with no Radix Select
    const hideButton = screen.getByRole('button', { name: /collapse dev role switcher/i })
    await user.click(hideButton)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
