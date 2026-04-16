/**
 * Accessibility tests for DevRoleSwitcher.
 * Ensures the component is always contained within a landmark region
 * so it never triggers the "region" axe rule.
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

describe('DevRoleSwitcher landmark accessibility', () => {
  it('expanded: content is contained within a named landmark region', () => {
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    // The component must expose a region landmark with an accessible name
    expect(screen.getByRole('region', { name: /developer tools/i })).toBeInTheDocument()
  })

  it('collapsed: content is contained within a named landmark region', async () => {
    const user = userEvent.setup()
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    // Collapse the panel
    await user.click(screen.getByRole('button', { name: /collapse dev role switcher/i }))

    // The wrapper div must still expose a region landmark
    expect(screen.getByRole('region', { name: /developer tools/i })).toBeInTheDocument()
  })

  it('expanded: has no axe violations', async () => {
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('collapsed: has no axe violations', async () => {
    const user = userEvent.setup()
    const { container } = render(<DevRoleSwitcher userAccount={regularAccount} />)

    await user.click(screen.getByRole('button', { name: /collapse dev role switcher/i }))

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
