import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminUsersStats } from '@/components/AdminUsersStats'
import { APIService } from '@/lib/api'
import { runA11yScan } from '../helpers/a11y'

const notify = {
  success: vi.fn(),
  error: vi.fn(),
}

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notify,
  }),
}))

describe('AdminUsersStats accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(APIService, 'getAllUsers').mockResolvedValue([
      {
        id: 'user-1',
        username: 'alice',
        role: 'user',
        email: 'alice@example.com',
        joinedAt: '2026-01-01T00:00:00.000Z',
        lastActive: '2026-06-01T10:00:00.000Z',
      },
    ])
    vi.spyOn(APIService, 'getUserStats').mockResolvedValue({
      productsSubmitted: 2,
      ratingsGiven: 4,
      discussionsParticipated: 1,
      totalContributions: 7,
    })
    vi.spyOn(APIService, 'setUserRole').mockResolvedValue(true)
  })

  it('has no obvious axe violations with loaded user data', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminUsersStats />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /users & statistics/i })

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('exposes a labeled users sort control and a named data table', async () => {
    render(
      <MemoryRouter>
        <AdminUsersStats />
      </MemoryRouter>
    )

    await screen.findByText('All Users')

    expect(screen.getByRole('combobox', { name: /sort users by/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /user statistics and role management table/i })).toBeInTheDocument()
  })
})
