import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AdminUsersStats } from '@/components/AdminUsersStats'
import { APIService } from '@/lib/api'

const notify = {
  success: vi.fn(),
  error: vi.fn(),
}

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ notify }),
}))

describe('AdminUsersStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(APIService, 'getAllUsers').mockResolvedValue([
      {
        id: 'user-1',
        username: 'alice',
        role: 'user',
      },
      {
        id: 'user-2',
        username: 'bob',
        role: 'user',
      },
    ])

    const getUserStats = vi.spyOn(APIService, 'getUserStats')
    getUserStats.mockImplementation(async (id: string) => {
      if (id === 'user-1') {
        return {
          productsSubmitted: 3,
          collectionsCreated: 2,
          productsOwnedSubmitted: 2,
          productsEditedManaged: 1,
          collectionsOwnedSubmitted: 1,
          collectionsEditedManaged: 1,
          ratingsGiven: 1,
          discussionsParticipated: 1,
          totalContributions: 5,
        }
      }

      return {
        productsSubmitted: 0,
        collectionsCreated: 0,
        productsOwnedSubmitted: 0,
        productsEditedManaged: 0,
        collectionsOwnedSubmitted: 0,
        collectionsEditedManaged: 0,
        ratingsGiven: 1,
        discussionsParticipated: 0,
        totalContributions: 1,
      }
    })

    vi.spyOn(APIService, 'getOwnedProducts').mockResolvedValue([
      {
        id: 'prod-1',
        slug: 'example-product',
        name: 'Example Product',
        createdAt: Date.now(),
      },
    ] as never[])

    vi.spyOn(APIService, 'setUserRole').mockResolvedValue(true)
  })

  it('does not fetch owned products when backend stats are trusted', async () => {
    render(
      <MemoryRouter>
        <AdminUsersStats />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /users & statistics/i })

    await waitFor(() => {
      expect(APIService.getOwnedProducts).not.toHaveBeenCalled()
    })
  })
})
