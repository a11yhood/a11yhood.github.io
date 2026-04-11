/**
 * Accessibility tests for AppHeader component.
 * Covers WCAG 2.1 link-name rule: links must have discernible text.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { runA11yScan } from '../helpers/a11y'
import type { UserData, UserAccount } from '@/lib/types'
import { createMockUserAccount } from '../helpers/create-mocks'

function renderHeader(user: UserData | null = null, userAccount: UserAccount | null = null) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppHeader
        user={user}
        userAccount={userAccount}
        pendingRequestsCount={0}
        onLogin={() => {}}
        onLogout={() => {}}
      />
    </MemoryRouter>
  )
}

describe('AppHeader logo link accessibility', () => {
  it('logo renders as a link (not a button) so navigation semantics are correct', () => {
    renderHeader()

    // The logo must be a link, not a button
    const logoLink = screen.getByRole('link', { name: /a11yhood home/i })
    expect(logoLink).toBeInTheDocument()
    expect(logoLink.tagName).toBe('A')
  })

  it('logo link navigates to /', () => {
    renderHeader()

    const logoLink = screen.getByRole('link', { name: /a11yhood home/i })
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('logo link has discernible text (link-name axe rule)', async () => {
    const { container } = renderHeader()

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('logo link has discernible text when user is authenticated', async () => {
    const user: UserData = { id: 'u1', username: 'alice' }
    const userAccount = createMockUserAccount({ id: 'u1', username: 'alice' })

    const { container } = renderHeader(user, userAccount)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
