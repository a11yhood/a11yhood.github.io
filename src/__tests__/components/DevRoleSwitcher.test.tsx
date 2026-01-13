import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import type { UserAccount } from '@/lib/types'

const adminAccount: UserAccount = {
  id: '49366adb-2d13-412f-9ae5-4c35dbffab10',
  username: 'admin_user',
  role: 'admin',
}

const moderatorAccount: UserAccount = {
  id: '94e116f7-885d-4d32-87ae-697c5dc09b9e',
  username: 'moderator_user',
  role: 'moderator',
}

const regularAccount: UserAccount = {
  id: '2a3b7c3e-971b-4b42-9c8c-0f1843486c50',
  username: 'regular_user',
  role: 'user',
}

beforeEach(() => {
  localStorage.clear()
})

describe('DevRoleSwitcher', () => {

  it('renders role switcher', () => {
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    expect(screen.getByText('Dev Mode: Role Switcher')).toBeInTheDocument()
    expect(screen.getByText('Active Dev Account')).toBeInTheDocument()
  })

  it('displays role options in select', async () => {
    const user = userEvent.setup()
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    const selectTrigger = screen.getByRole('combobox')
    await user.click(selectTrigger)

    // Radix Select renders the current value inside the trigger and the list items in the popover.
    // Query by role to avoid multiple matches for the same label.
    expect(screen.getByRole('option', { name: /👤 regular_user/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /🛡️ moderator_user/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /👑 admin_user/ })).toBeInTheDocument()
  })

  it('handles null userAccount gracefully', () => {
    render(<DevRoleSwitcher userAccount={null} />)

    expect(screen.getByText('Dev Mode: Role Switcher')).toBeInTheDocument()
  })

  it('stores selected role in localStorage', async () => {
    const user = userEvent.setup()
    render(<DevRoleSwitcher userAccount={regularAccount} />)

    const selectTrigger = screen.getByRole('combobox')
    await user.click(selectTrigger)

    const moderatorOption = screen.getByText(/🛡️ moderator_user/)
    await user.click(moderatorOption)

    expect(localStorage.getItem('dev-user')).toBe('moderator')
  })
})
