import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/UserProfile'
import { APIService } from '@/lib/api'
import type { Product, UserAccount, UserData } from '@/lib/types'

vi.mock('@/components/UserRequestsPanel', () => ({
  UserRequestsPanel: () => <div data-testid="user-requests-panel" />,
}))

const userAccount = {
  id: 'user-1',
  username: 'testuser',
  role: 'user',
  createdAt: new Date('2024-01-01').toISOString(),
} as UserAccount

const userData = {
  id: 'user-1',
  username: 'testuser',
} as UserData

const staleStats = {
  productsSubmitted: 0,
  ratingsGiven: 0,
  discussionsParticipated: 0,
  totalContributions: 0,
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(APIService, 'getUserStats').mockResolvedValue(staleStats)
  vi.spyOn(APIService, 'getOwnedProducts').mockResolvedValue([
    {
      id: 'product-1',
      name: 'ProgramAT',
      createdAt: Date.now(),
    } as unknown as Product,
  ])
})

describe('UserProfile contribution statistics', () => {
  it('uses owned products count when productsSubmitted is behind', async () => {
    render(
      <MemoryRouter>
        <UserProfile userAccount={userAccount} user={userData} onProductClick={() => {}} />
      </MemoryRouter>
    )

    const productsLabel = await screen.findByText(/^Products$/)
    const totalLabel = await screen.findByText(/^Total$/)

    expect(productsLabel.previousElementSibling).toHaveTextContent('1')
    expect(totalLabel.previousElementSibling).toHaveTextContent('1')
  })
})
