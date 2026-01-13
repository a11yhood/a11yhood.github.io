import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { RequestCard } from '@/components/RequestCard'
import type { UserRequest } from '@/lib/types'

describe('RequestCard public profile link', () => {
  it('renders username as link to public profile when login available', async () => {
    const request: UserRequest = {
      id: 'req-1',
      userId: 'u1',
      userName: 'Alice',
      userAvatarUrl: undefined,
      type: 'moderator',
      message: undefined,
      reason: undefined,
      status: 'pending',
      createdAt: Date.now(),
      productId: undefined,
    }

    const userLookup = {
      u1: { name: 'Alice', role: 'user', username: 'alice' },
    } as Record<string, { name?: string; role?: 'user' | 'moderator' | 'admin' | 'unknown'; username?: string }>

    render(
      <MemoryRouter>
        <RequestCard request={request} userLookup={userLookup} />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: 'Alice' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/profile/alice')
  })

  it('falls back to plain text when login not available', async () => {
    const request: UserRequest = {
      id: 'req-2',
      userId: 'u2',
      userName: 'Bob',
      userAvatarUrl: undefined,
      type: 'admin',
      message: undefined,
      reason: undefined,
      status: 'pending',
      createdAt: Date.now(),
      productId: undefined,
    }

    const userLookup = {
      u2: { name: 'Bob', role: 'moderator' },
    } as Record<string, { name?: string; role?: 'user' | 'moderator' | 'admin' | 'unknown'; username?: string }>

    render(
      <MemoryRouter>
        <RequestCard request={request} userLookup={userLookup} />
      </MemoryRouter>
    )

    // No link with name Bob
    expect(screen.queryByRole('link', { name: 'Bob' })).toBeNull()
    // Plain text heading should exist
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })
})
