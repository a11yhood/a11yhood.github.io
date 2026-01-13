import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminDashboard } from '@/components/AdminDashboard'
import type { Product, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'

// Fixed IDs and roles (mirrors backend/seed_test_users.py)
const adminAccount: UserAccount = {
  id: '49366adb-2d13-412f-9ae5-4c35dbffab10',
  username: 'admin_user',
  role: 'admin',
}

const moderatorAccount: UserAccount = {
  id: '94e116f7-885d-4d32-87ae-697c5dc09b9e',
  username: 'moderator_user',
  role: 'moderator',
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(APIService, 'getAllUsers').mockResolvedValue([])
  vi.spyOn(APIService, 'getScrapingLogs').mockResolvedValue([])
  vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
  // Avoid real network/auth requirements in AdminRequestsPanel
  // The dashboard now shows a requests card instead of tabs
  // and loads requests immediately on mount.
  // Return an empty list to render the empty state deterministically.
  // @ts-expect-error: dynamic mock target
  vi.spyOn(APIService, 'getAllRequests').mockResolvedValue([])
})

const baseProps = {
  onBack: vi.fn(),
  products: [] as Product[],
  onProductsUpdate: vi.fn(),
  onBlogPostsUpdate: vi.fn(),
  ravelryAuthTimestamp: 0,
}

describe('AdminDashboard role-based tabs', () => {
  it('shows requests section for moderators without admin-only sections', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard
          {...baseProps}
          userAccount={moderatorAccount}
        />
      </MemoryRouter>
    )

    expect(await screen.findByText('Moderator Dashboard')).toBeInTheDocument()
    // The requests panel should be visible
    expect(await screen.findByText('User Requests')).toBeInTheDocument()
    // Admin-only dashboard sections are not shown to moderators
    expect(screen.queryByText('External Product Scraper')).toBeNull()
    expect(screen.queryByText('Authorization Settings')).toBeNull()
    expect(screen.queryByText('News & Blog Posts')).toBeNull()
    // Legacy tabs are removed in the new design (no role="tab" items with these names)
    expect(screen.queryByRole('tab', { name: 'Users & Stats' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Products' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Scraping Logs' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Blog' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Authorizations' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'OAuth Logs' })).toBeNull()
  })

  it('shows products and requests sections for admins (no tabs)', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard
          {...baseProps}
          userAccount={adminAccount}
        />
      </MemoryRouter>
    )

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument()
    // New design: sections instead of tabs. Title may appear more than once.
    const productScraperTitles = await screen.findAllByText('External Product Scraper')
    expect(productScraperTitles.length).toBeGreaterThan(0)
    expect(await screen.findByText('User Requests')).toBeInTheDocument()
    expect(await screen.findByText('News & Blog Posts')).toBeInTheDocument()
    expect(await screen.findByText('Authorization Settings')).toBeInTheDocument()
    // Legacy tabs are removed
    expect(screen.queryByRole('tab', { name: 'Users & Stats' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Products' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Scraping Logs' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Blog' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Requests' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Authorizations' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'OAuth Logs' })).toBeNull()
  })
})
