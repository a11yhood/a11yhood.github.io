/**
 * Contract tests for request moderation API calls used by AdminRequestsPanel.
 *
 * These tests assert endpoint, HTTP method, and payload shape without relying
 * on a live backend so failures are deterministic and not network-dependent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, APIService } from '@/lib/api'

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
