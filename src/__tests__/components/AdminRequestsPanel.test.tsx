/**
 * Contract tests for request moderation API calls used by AdminRequestsPanel.
 *
 * These tests assert endpoint, HTTP method, and payload shape without relying
 * on a live backend so failures are deterministic and not network-dependent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { APIError, APIService } from '@/lib/api'
import { AdminRequestsPanel } from '@/components/AdminRequestsPanel'
import { Product, UserRequest } from '@/lib/types'

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notify: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}))

describe('AdminRequestsPanel API Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends PATCH /api/requests/{id} with approved status', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'req-123',
          status: 'approved',
          created_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const result = await APIService.approveRequest('req-123', 'admin-id', 'looks good')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/api/requests/req-123')
    expect(options?.method).toBe('PATCH')
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
    })
    expect(options?.body).toBe(JSON.stringify({ status: 'approved' }))

    expect(result).toBeTruthy()
    expect(result?.status).toBe('approved')
    expect((result as any)?.created_at).toBeUndefined()
  })

  it('sends PATCH /api/requests/{id} with rejected status', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'req-456',
          status: 'rejected',
          created_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const result = await APIService.rejectRequest('req-456', 'admin-id', 'does not meet criteria')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/api/requests/req-456')
    expect(options?.method).toBe('PATCH')
    expect(options?.body).toBe(JSON.stringify({ status: 'rejected' }))

    expect(result).toBeTruthy()
    expect(result?.status).toBe('rejected')
  })

  it('throws APIError when moderation request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ detail: 'Not authorized to moderate this request' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await expect(APIService.approveRequest('req-789', 'moderator-id')).rejects.toEqual(
      expect.objectContaining<Partial<APIError>>({
        name: 'APIError',
        status: 403,
      })
    )
  })
})

describe('AdminRequestsPanel product ownership request resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves request product by ID when product is missing from props list', async () => {
    const request: UserRequest = {
      id: 'req-product-1',
      userId: 'user-123',
      userName: 'Requester',
      type: 'product-ownership',
      status: 'pending',
      createdAt: Date.now(),
      productId: 'b5a1cc2b-a50c-4017-b215-b2921a030ef1',
    }

    const resolvedProduct: Product = {
      id: 'b5a1cc2b-a50c-4017-b215-b2921a030ef1',
      slug: 'assistive-widget',
      name: 'Assistive Widget',
      type: 'Software',
      source: 'Github',
      description: 'A test product resolved by ID',
      tags: ['a11y'],
      createdAt: Date.now(),
      editorIds: [],
    }

    vi.spyOn(APIService, 'getAllRequests').mockResolvedValue([request])
    vi.spyOn(APIService, 'getUserAccount').mockResolvedValue({
      id: 'user-123',
      role: 'user',
      username: 'requester',
    })
    const getProductSpy = vi.spyOn(APIService, 'getProductById').mockResolvedValue(resolvedProduct)

    render(
      <MemoryRouter>
        <AdminRequestsPanel adminId="admin-1" products={[]} canManageRoleRequests />
      </MemoryRouter>
    )

    expect(await screen.findByText('Assistive Widget')).toBeInTheDocument()
    expect(screen.queryByText('Product Not Found')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled()
    expect(getProductSpy).toHaveBeenCalledWith('b5a1cc2b-a50c-4017-b215-b2921a030ef1')
  })
})
