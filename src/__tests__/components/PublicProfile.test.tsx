import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PublicProfile } from '@/components/PublicProfile'
import { APIService } from '@/lib/api'
import type { UserAccount } from '@/lib/types'

const mockAccount: UserAccount = {
  id: 'user-uuid-1',
  username: 'testuser',
  role: 'user',
  createdAt: new Date('2024-01-01').toISOString(),
}

const defaultStats = {
  productsSubmitted: 0,
  ratingsGiven: 0,
  discussionsParticipated: 0,
  totalContributions: 0,
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(APIService, 'getUserByUsername').mockResolvedValue(mockAccount)
  vi.spyOn(APIService, 'getUserStats').mockResolvedValue(defaultStats)
  vi.spyOn(APIService, 'getProductsByOwner').mockResolvedValue([])
  vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([])
  vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
})

describe('PublicProfile', () => {
  it('calls getUserByUsername with the route username prop', async () => {
    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(APIService.getUserByUsername).toHaveBeenCalledWith('testuser')
    })
  })

  it('calls getUserStats and getProductsByOwner with the account username (not id)', async () => {
    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(APIService.getUserStats).toHaveBeenCalledWith('testuser')
      expect(APIService.getProductsByOwner).toHaveBeenCalledWith('testuser')
    })
  })

  it('shows error state when getUserByUsername rejects', async () => {
    vi.spyOn(APIService, 'getUserByUsername').mockRejectedValue(new Error('Network error'))

    render(
      <MemoryRouter>
        <PublicProfile username="unknownuser" />
      </MemoryRouter>
    )

    expect(await screen.findByText('Could not load user profile')).toBeInTheDocument()
  })

  it('shows "User not found" when getUserByUsername returns null', async () => {
    vi.spyOn(APIService, 'getUserByUsername').mockResolvedValue(null)

    render(
      <MemoryRouter>
        <PublicProfile username="ghost" />
      </MemoryRouter>
    )

    expect(await screen.findByText('User not found')).toBeInTheDocument()
  })

  it('renders profile heading when account loads successfully', async () => {
    render(
      <MemoryRouter>
        <PublicProfile username="testuser" />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: /profile/i })).toBeInTheDocument()
  })
})
