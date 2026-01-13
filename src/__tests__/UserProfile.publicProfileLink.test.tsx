import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/UserProfile'
import type { UserAccount, UserData, Product } from '@/lib/types'

describe('UserProfile public profile link', () => {
  it('shows View Public Profile linking to /profile/:login', async () => {
    const userAccount = {
      id: 'u1',
      username: 'Alice',
      login: 'alice',
      role: 'user',
      createdAt: Date.now(),
    } as unknown as UserAccount

    const user = {
      id: 'u1',
      login: 'alice',
    } as UserData

    render(
      <MemoryRouter>
        <UserProfile
          userAccount={userAccount}
          user={user}
          onUpdate={() => {}}
          onProductClick={(p: Product) => {}}
          onCollectionsClick={() => {}}
        />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: /view public profile/i })
    expect(link).toHaveAttribute('href', '/profile/alice')
  })
})
