/**
 * Security tests for authorization - verify backend enforces role-based access control.
 * 
 * These tests verify that the backend properly enforces permissions and rejects
 * unauthorized operations with 401/403 responses.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { runAllSeeds } from '../fixtures/test-seeds'

const API_BASE = 'http://localhost:8000/api'

const testUserId = DEV_USERS.user.id
const authToken = getDevToken(testUserId)
const moderatorId = DEV_USERS.moderator.id
const moderatorToken = getDevToken(moderatorId)

describe('Backend Authorization Enforcement', () => {
  beforeAll(async () => {
    await runAllSeeds()
  })
  describe('Authentication Required', () => {
    it('should reject unauthenticated product creation', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No Authorization header
        body: JSON.stringify({
          name: 'Unauthorized Product',
          description: 'Should be rejected',
          source_url: 'https://example.com/product',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should reject unauthenticated collection creation', async () => {
      const response = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No Authorization header
        body: JSON.stringify({
          name: 'Unauthorized Collection',
          description: 'Should be rejected',
          is_public: true,
        }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Ownership Enforcement', () => {
    it('should reject product updates by non-owners', async () => {
      // Moderator creates a product
      const createRes = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${moderatorToken}`,
        },
        body: JSON.stringify({
          name: 'Owner Test Product',
          description: 'For ownership testing',
          source_url: 'https://example.com/owner-test',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(createRes.status).toBe(201)
      const product = await createRes.json()

      // Regular user tries to update moderator's product
      const updateRes = await fetch(`${API_BASE}/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Hacked by Regular User',
        }),
      })

      expect(updateRes.status).toBe(403)
    })

    it('should reject adding products to non-owned collections', async () => {
      // User 1 creates a collection
      const collectionRes = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          // Keep this one since it had Bearer already - checking
        },
        body: JSON.stringify({
          name: 'Owner Collection',
          description: 'For ownership testing',
          is_public: true,
        }),
      })

      expect(collectionRes.status).toBe(201)
      const collection = await collectionRes.json()

      // User 1 creates a product
      const productRes = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Test Product',
          description: 'For collection testing',
          source_url: 'https://example.com/product',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(productRes.status).toBe(201)
      const product = await productRes.json()

      // Use moderator as second user
      const user2Token = moderatorToken

      // User 2 tries to add product to User 1's collection
      const addRes = await fetch(
        `${API_BASE}/collections/${collection.id}/products/${product.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
                'Authorization': `Bearer ${user2Token}`,
          },
        }
      )

      expect(addRes.status).toBe(403)
    })
  })

  describe('Private Collection Access Control', () => {
    it('should reject access to private collections by non-owners', async () => {
      // User 1 creates a private collection
      const createRes = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Private Collection',
          description: 'Should be hidden from others',
          is_public: false,
        }),
      })

      expect(createRes.status).toBe(201)
      const collection = await createRes.json()

      // Create User 2
      const user2Id = `test-user-2-${Date.now()}`
      const user2Res = await fetch(`${API_BASE}/users/${user2Id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `testuser2${Date.now()}`,
          email: `test2${Date.now()}@example.com`,
        }),
      })

      expect([200, 201]).toContain(user2Res.status)
      const user2 = await user2Res.json()
      const user2Token = `dev-token-${user2.id}`

      // User 2 tries to access User 1's private collection
      const getRes = await fetch(`${API_BASE}/collections/${collection.id}`, {
        headers: {
           'Authorization': `Bearer ${user2Token}`,
        },
      })

      expect(getRes.status).toBe(403)
    })

    it('should allow owner access to their private collections', async () => {
      // User creates a private collection
      const createRes = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          // Check this one
        },
        body: JSON.stringify({
          name: 'My Private Collection',
          description: 'Owner should be able to access',
          is_public: false,
        }),
      })

      expect(createRes.status).toBe(201)
      const collection = await createRes.json()

      // Owner accesses their own private collection
      const getRes = await fetch(`${API_BASE}/collections/${collection.id}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(getRes.status).toBe(200)
    })
  })
})
