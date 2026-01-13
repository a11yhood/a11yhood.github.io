import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import type { UserData, UserAccount } from '@/lib/types'

describe('AppHeader collections navigation', () => {
  it('navigates to /collections from header button', async () => {
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
          <Route path="/collections" element={<div>Collections Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    const btn = screen.getByRole('button', { name: /collections/i })
    await userEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText('Collections Page')).toBeInTheDocument()
    })
  })
})
