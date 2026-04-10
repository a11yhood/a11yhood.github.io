import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/UserProfile'
import type { UserAccount, UserData } from '@/lib/types'

function renderUserProfile(website: string) {
  const userAccount = {
    id: 'u1',
    displayName: 'Alice',
    username: 'alice',
    role: 'user',
    createdAt: Date.now(),
    website,
  } as unknown as UserAccount

  const user = {
    id: 'u1',
    username: 'alice',
  } as UserData

  render(
    <MemoryRouter>
      <UserProfile
        userAccount={userAccount}
        user={user}
        onUpdate={() => {}}
        onProductClick={() => {}}
        onCollectionsClick={() => {}}
      />
    </MemoryRouter>
  )
}

describe('UserProfile website URL validation', () => {
  it('renders a website link for a valid https URL', () => {
    renderUserProfile('https://example.com')
    const link = screen.getByRole('link', { name: /website/i })
    expect(link).toHaveAttribute('href', 'https://example.com/')
  })

  it('renders a website link for a valid http URL', () => {
    renderUserProfile('http://example.com')
    const link = screen.getByRole('link', { name: /website/i })
    expect(link).toHaveAttribute('href', 'http://example.com/')
  })

  it('does not render a website link for a javascript: URL', () => {
    renderUserProfile('javascript:alert(1)')
    expect(screen.queryByRole('link', { name: /website/i })).toBeNull()
  })

  it('does not render a website link for a data: URL', () => {
    renderUserProfile('data:text/html,<script>alert(1)</script>')
    expect(screen.queryByRole('link', { name: /website/i })).toBeNull()
  })

  it('does not render a website link for a malformed URL', () => {
    renderUserProfile('not-a-valid-url')
    expect(screen.queryByRole('link', { name: /website/i })).toBeNull()
  })
})
