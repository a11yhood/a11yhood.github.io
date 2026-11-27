import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { DiscussionSection } from '@/components/DiscussionSection'

describe('signed-out users see actions that lead to sign-in', () => {
  it('header Submit Product signs in and returns to the current page', async () => {
    const onLogin = vi.fn()
    render(
      <MemoryRouter initialEntries={['/products?q=braille']}>
        <AppHeader user={null} userAccount={null} pendingRequestsCount={0} onLogin={onLogin} onLogout={() => {}} />
      </MemoryRouter>
    )

    // Accessible name starts with the visible text so voice control can target it (WCAG 2.5.3).
    await userEvent.click(screen.getByRole('button', { name: 'Submit Product (sign in required)' }))

    expect(onLogin).toHaveBeenCalledWith('/products?q=braille')
  })

  it('discussion offers a sign-in button', async () => {
    const onRequireLogin = vi.fn()
    render(<DiscussionSection discussions={[]} user={null} onDiscuss={() => {}} onRequireLogin={onRequireLogin} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign in to join the discussion' }))

    expect(onRequireLogin).toHaveBeenCalledOnce()
  })
})
