import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIService } from '@/lib/api'

/**
 * Tests for APIService.getCurrentUser()
 *
 * Regression tests for the account-creation bug where a 404 from /users/me was
 * swallowed and returned as null, causing App.tsx to throw a status-less Error
 * that the catch block misidentified as an unexpected failure instead of a
 * "new user — create account" signal.
 *
 * Expected behaviour:
 *   - 200  → returns the UserAccount
 *   - 404  → returns null (caller interprets as "user not found, create account")
 *   - 4xx/5xx (non-404) → throws so the caller can surface the real error
 */

describe('APIService.getCurrentUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the user account when /users/me responds with 200', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'user-uuid-123',
          username: 'testuser',
          email: 'testuser@example.com',
          role: 'user',
          created_at: '2025-01-01T00:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await APIService.getCurrentUser()

    expect(result).not.toBeNull()
    expect(result?.id).toBe('user-uuid-123')
    expect(result?.username).toBe('testuser')
  })

  it('returns null when /users/me responds with 404 (new user, account not yet created)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await APIService.getCurrentUser()

    expect(result).toBeNull()
  })

  it('throws when /users/me responds with 401 (unauthenticated)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await expect(APIService.getCurrentUser()).rejects.toMatchObject({ status: 401 })
  })

  it('throws when /users/me responds with 500 (server error)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await expect(APIService.getCurrentUser()).rejects.toMatchObject({ status: 500 })
  })

  describe('cache revalidation (#324)', () => {
    // /users/me is served with `Cache-Control: private, max-age=30`, so after a
    // profile edit the caller must bypass the browser cache to see the new data.
    const okResponse = () =>
      new Response(JSON.stringify({ id: 'user-uuid-123', username: 'testuser', role: 'user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    it("revalidates with cache: 'no-cache' when fresh is true", async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(okResponse())

      await APIService.getCurrentUser({ fresh: true })

      const [url, init] = fetchSpy.mock.calls[0]
      expect(String(url)).toContain('/users/me')
      expect(init).toMatchObject({ cache: 'no-cache' })
    })

    it('does not set a cache mode by default', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(okResponse())

      await APIService.getCurrentUser()

      const [, init] = fetchSpy.mock.calls[0]
      expect(init).not.toHaveProperty('cache')
    })
  })
})
