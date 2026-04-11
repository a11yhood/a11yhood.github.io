/**
 * Accessibility tests for DevRoleSwitcher.
 * Ensures WCAG 2.1 compliance:
 * - Component content must be contained within a landmark region (axe: region).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import type { UserAccount } from '@/lib/types'
import { runA11yScan } from '../helpers/a11y'

const regularAccount: UserAccount = {
  id: '2a3b7c3e-971b-4b42-9c8c-0f1843486c50',
  username: 'regular_user',
  role: 'user',
}

beforeEach(() => {
  localStorage.clear()
})

describe('DevRoleSwitcher – landmark region (axe: region)', () => {
  it('expanded state: renders inside a complementary landmark', () => {
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    // The aside with aria-label provides the complementary landmark
    expect(screen.getByRole('complementary', { name: /dev role switcher/i })).toBeInTheDocument()
  })

  it('collapsed state: renders inside a complementary landmark', async () => {
    const user = userEvent.setup()
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    // Collapse the panel
    await user.click(screen.getByRole('button', { name: /collapse dev role switcher/i }))

    expect(screen.getByRole('complementary', { name: /dev role switcher/i })).toBeInTheDocument()
  })

  it('expanded state: has no axe region violations', async () => {
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('collapsed state: has no axe region violations', async () => {
    const user = userEvent.setup()
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    // Collapse the panel
    await user.click(screen.getByRole('button', { name: /collapse dev role switcher/i }))

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
