/**
 * Accessibility tests for AppHeader component.
 * Covers WCAG 2.1 link-name rule: links must have discernible text.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

describe('AppHeader names below the sm breakpoint (#73)', () => {
  // jsdom loads no Tailwind CSS, so `hidden` has no effect in tests and an icon-only link still
  // seems to have its text. Add Tailwind's own `hidden` and `sr-only` rules (the `sm:` rules stay
  // off, as below the breakpoint) so these tests see what a phone, or a desktop zoomed in past
  // the breakpoint, gets.
  let style: HTMLStyleElement

  beforeEach(() => {
    style = document.createElement('style')
    style.textContent = `
      .hidden { display: none; }
      .sr-only {
        position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
        overflow: hidden; clip-path: inset(50%); white-space: nowrap; border-width: 0;
      }
    `
    document.head.appendChild(style)
  })

  afterEach(() => {
    style.remove()
  })

  it('names every navigation link when only the icons show', async () => {
    const { container } = renderHeader()

    for (const name of ['About', 'Blog', 'Collections', 'Products']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('starts the user menu name with the username it shows (WCAG 2.5.3 Label in Name)', async () => {
    const user: UserData = { id: 'u1', username: 'alice' }
    const userAccount = createMockUserAccount({ id: 'u1', username: 'alice' })

    const { container } = renderHeader(user, userAccount)

    expect(screen.getByRole('button', { name: /^alice\b.*user menu/i })).toBeInTheDocument()

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
