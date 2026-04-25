import { it, expect, beforeAll, afterAll } from 'vitest'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { describeWithBackend } from '../helpers/with-backend'

describeWithBackend('User Stats Integration Tests - joined_at and last_active', () => {
  let testUserId: string
  let authToken: string

  beforeAll(async () => {
    authToken = getDevToken(DEV_USERS.admin.role)
    setAuthTokenGetter(async () => authToken)

    const currentUser = await APIService.getCurrentUser()
    if (!currentUser?.id) {
      throw new Error('Failed to resolve current user for user-stats tests')
    }
    testUserId = currentUser.id
  })

  afterAll(async () => {
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
    const result = await APIService.getUserAccount(testUserId)

    expect(result).toBeDefined()
    expect(result.id).toBe(testUserId)
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
