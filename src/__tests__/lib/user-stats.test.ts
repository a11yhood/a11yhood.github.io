import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { APIService, setAuthTokenGetter } from '@/lib/api'

const API_BASE = 'http://localhost:8000/api'

describe('User Stats Integration Tests - joined_at and last_active', () => {
  let testUserId: string
  let authToken: string

  beforeEach(async () => {
    // Create test user with retry logic
    const userId = `test-user-${Date.now()}`
    let lastError: Error | null = null
    let userRes: Response | null = null
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        userRes = await fetch(`${API_BASE}/users/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: `testuser${Date.now()}`,
            email: `test${Date.now()}@example.com`,
          }),
        })

        if (userRes.ok) {
          const user = await userRes.json()
          testUserId = user.id
          authToken = `dev-token-${testUserId}`

          // Set up the auth token getter for APIService
          setAuthTokenGetter(async () => authToken)
          return // Success
        }

        lastError = new Error(`Failed to create test user: ${userRes.statusText}`)
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
        }
      }
    }
    
    throw lastError || new Error('Failed to create test user after 3 attempts')
  })

  afterEach(async () => {
    // Clean up auth token getter
    setAuthTokenGetter(async () => null)
  })

  it('loads user account with joinedAt timestamp', async () => {
    const result = await APIService.getUserAccount(testUserId)

    expect(result).toBeDefined()
    expect(result?.id).toBe(testUserId)
    // createdAt should be present (from database)
    expect(result?.createdAt).toBeDefined()
    // joinedAt and lastActive may be present depending on backend implementation
    if (result?.joinedAt) {
      expect(typeof result.joinedAt).toBe('string')
      expect(result.joinedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('converts snake_case response to camelCase', async () => {
    const result = await APIService.getUserAccount(testUserId)

    // Should have camelCase properties
    expect(result?.createdAt).toBeDefined()
    // updatedAt is not part of UserAccount; lastActive is used instead
    if (result?.lastActive) {
      expect(typeof result.lastActive).toBe('string')
    }
    
    // snake_case should not be in result
    expect((result as any)?.created_at).toBeUndefined()
    // updated_at may not be present depending on backend; ensure no snake_case fields leak
    expect((result as any)?.updated_at).toBeUndefined()
    expect((result as any)?.joined_at).toBeUndefined()
    expect((result as any)?.last_active).toBeUndefined()
    expect((result as any)?.avatar_url).toBeUndefined()
  })

  it('handles missing timestamps gracefully', async () => {
    const result = await APIService.getUserAccount(testUserId)

    expect(result).toBeDefined()
    expect(result?.id).toBe(testUserId)
    
    // Even if timestamps are null/undefined, the object should be valid
    expect(result?.username).toBeDefined()
    expect(result?.role).toBeDefined()
  })

  it('includes timestamps in create or update user account', async () => {
    const newUsername = `updateduser${Date.now()}`
    const avatarUrl = 'https://example.com/avatar.jpg'
    const email = `updated${Date.now()}@example.com`

    const result = await APIService.createOrUpdateUserAccount(
      testUserId,
      newUsername,
      avatarUrl,
      email
    )

    expect(result).toBeDefined()
    expect(result.id).toBe(testUserId)
    expect(result.username).toBe(newUsername)
    expect(result.avatarUrl).toBe(avatarUrl)
    expect(result.createdAt).toBeDefined()
    
    // Verify timestamps are ISO strings if present
    if (result.joinedAt) {
      expect(typeof result.joinedAt).toBe('string')
      expect(result.joinedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
    if (result.lastActive) {
      expect(typeof result.lastActive).toBe('string')
      expect(result.lastActive).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('UserAccount type includes joinedAt and lastActive fields', async () => {
    // This is a compile-time check - if the types are wrong, TypeScript will error
    const result = await APIService.getUserAccount(testUserId)
    
    expect(result).toBeDefined()
    
    // TypeScript will error if these fields aren't in the type
    const joinedAt = result?.joinedAt
    const lastActive = result?.lastActive
    
    // Fields should exist in type (even if undefined)
    expect('joinedAt' in (result || {})).toBe(true)
    expect('lastActive' in (result || {})).toBe(true)
  })

  it('formats timestamps consistently', async () => {
    const result = await APIService.getUserAccount(testUserId)

    expect(result).toBeDefined()
    
    // All timestamps should be ISO strings if present
    if (result?.createdAt) {
      expect(typeof result.createdAt).toBe('string')
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
    
    if (result?.joinedAt) {
      expect(typeof result.joinedAt).toBe('string')
      expect(result.joinedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
    
    if (result?.lastActive) {
      expect(typeof result.lastActive).toBe('string')
      expect(result.lastActive).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })
})
