/**
 * Accessibility tests for DevRoleSwitcher
 * Ensures the fixed overlay content is contained within a landmark region
 * per WCAG 2.1 success criterion (axe rule: region).
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

describe('DevRoleSwitcher accessibility', () => {
  it('expanded state: content is contained within a complementary landmark', () => {
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    // The complementary landmark should exist and contain the switcher title
    const region = screen.getByRole('complementary', { name: /developer tools/i })
    expect(region).toBeInTheDocument()
    expect(region).toHaveTextContent('Dev Mode: Role Switcher')
  })

  it('collapsed state: button is contained within a complementary landmark', async () => {
    const user = userEvent.setup()
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    // Collapse the panel
    await user.click(screen.getByRole('button', { name: /collapse dev role switcher/i }))

    const region = screen.getByRole('complementary', { name: /developer tools/i })
    expect(region).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expand dev role switcher/i })).toBeInTheDocument()
  })

  it('has no axe violations in expanded state', async () => {
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe violations in collapsed state', async () => {
    const user = userEvent.setup()
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    await user.click(screen.getByRole('button', { name: /collapse dev role switcher/i }))

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
