import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import type { UserData, UserAccount } from '@/lib/types'

describe('AppHeader public profile navigation', () => {
  it('navigates to /profile/:login from dropdown', async () => {
    const user = { id: 'u1', login: 'alice', avatarUrl: undefined } as UserData
    const userAccount = { id: 'u1', username: 'alice', role: 'user' } as UserAccount

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <AppHeader
                user={user}
                userAccount={userAccount}
                pendingRequestsCount={0}
                onLogin={() => {}}
                onLogout={() => {}}
              />
            )}
          />
          <Route path="/profile/:login" element={<div>Public Profile</div>} />
        </Routes>
      </MemoryRouter>
    )

    const trigger = screen.getByRole('button', { name: /user menu/i })
    await userEvent.click(trigger)

    const item = screen.getByRole('menuitem', { name: /public profile/i })
    await userEvent.click(item)

    await waitFor(() => {
      expect(screen.getByText('Public Profile')).toBeInTheDocument()
    })
  })
})
