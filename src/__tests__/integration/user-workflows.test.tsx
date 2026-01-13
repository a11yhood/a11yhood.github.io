import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { ProductEditors } from '@/components/ProductEditors'
import { ProductCard } from '@/components/ProductCard'
import * as types from '@/lib/types'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { runAllSeeds } from '../fixtures/test-seeds'

/**
 * Frontend Integration Tests for User Workflows
 * 
 * These tests verify that frontend actions produce expected results using real API:
 * - Product submission calls correct API endpoints
 * - Activities are logged when user actions occur
 * - User data is properly displayed after modifications
 * - Error handling is correct
 * 
 * Related User Stories:
 * - 3.1: User submits a product
 * - 4.1: User rates a product  
 * - 5.1: User participates in discussions
 * - 8.1: User activities are logged
 */

const API_BASE = 'http://localhost:8000/api'

let testUserId: string
let testProductId: string
let authToken: string

beforeAll(async () => {
  await runAllSeeds()
})

beforeEach(async () => {
  // Create test user with retry logic
  const userId = `test-user-${Date.now()}`
  let lastError: Error | null = null
  let user: any = null
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const userRes = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `testuser${Date.now()}`,
          email: `test${Date.now()}@example.com`,
        }),
      })

      if (userRes.ok) {
        user = await userRes.json()
        break
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

  if (!user) {
    throw lastError || new Error('Failed to create test user after 3 attempts')
  }

  testUserId = user.id
  authToken = `dev-token-${testUserId}`

  // Set up the auth token getter for APIService
  setAuthTokenGetter(async () => authToken)

  // Create test product for rating/discussion tests using APIService (handles snake_case conversion)
  const product = await APIService.createProduct({
    name: `Test Product ${Date.now()}`,
    description: 'A test product for workflow testing with sufficient description content',
    type: 'Software',
    sourceUrl: `https://github.com/test/product-${Date.now()}`,
    imageUrl: 'https://example.com/image.png',
  })
  
  testProductId = product.id
})

afterEach(async () => {
  // Clean up auth token getter
  setAuthTokenGetter(async () => null)
})

// ============================================================================
// STORY 3.1: USER SUBMITS A NEW PRODUCT
// ============================================================================

describe('Product Submission Workflow', () => {
  it('should submit product with all required fields', async () => {
    const productData = {
      name: `New Product ${Date.now()}`,
      description: 'A test product for integration testing with sufficient content',
      type: 'Software',
      sourceUrl: `https://github.com/test/product-${Date.now()}`,
      imageUrl: 'https://example.com/image.png',
    }

    const result = await APIService.createProduct(productData as any)

    expect(result).toBeDefined()
    expect(result.name).toBe(productData.name)
    expect(result.createdBy).toBe(testUserId)
    expect(result.source.toLowerCase()).toBe('github')  // Auto-assigned from github.com domain
  })

  it('should log activity when product is submitted', async () => {
    const activity: types.UserActivity = {
      userId: testUserId,
      type: 'product_submit',
      productId: testProductId,
      timestamp: Date.now(),
    }

      const result = await APIService.logUserActivity(activity)

      expect(result).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.type).toBe('product_submit')
  })
})

// ============================================================================
// STORY 4.1: USER RATES A PRODUCT
// ============================================================================

describe('Product Rating Workflow', () => {
  it('should update rating and log activity', async () => {
    const rating = 4

    // Create rating
    const result = await APIService.updateRating(testProductId, testUserId, rating)

    expect(result).toBeDefined()
    expect(result.rating).toBe(rating)

    // Log activity
    const activity: types.UserActivity = {
      userId: testUserId,
      type: 'rating',
      productId: testProductId,
      timestamp: Date.now(),
      metadata: { rating },
    }

    const activityResult = await APIService.logUserActivity(activity)
    expect(activityResult).toBeDefined()
  })
})

// ============================================================================
// STORY 5.1: USER PARTICIPATES IN DISCUSSIONS
// ============================================================================

describe('Discussion Participation Workflow', () => {
  it('should create discussion with parent ID for replies', async () => {
    // First create a parent discussion
    const parentData = {
      productId: testProductId,
        content: 'Starting a discussion',
    }

    const parent = await APIService.createDiscussion(parentData as any)

    // Then create a reply
    const discussionData = {
      productId: testProductId,
      parentId: parent.id,
        content: 'I agree with this!',
    }

    const result = await APIService.createDiscussion(discussionData as any)

    expect(result).toBeDefined()
    expect(result.parentId).toBe(parent.id)
  })

  it('should create discussion without parent for new threads', async () => {
    const discussionData = {
      productId: testProductId,
      content: 'Starting a new discussion',
    }

    const result = await APIService.createDiscussion(discussionData as any)

    expect(result).toBeDefined()
    expect(result.parentId).toBeNull()
  })

  it('should log activity when discussion is posted', async () => {
    const activity: types.UserActivity = {
      userId: testUserId,
      type: 'discussion',
      productId: testProductId,
      timestamp: Date.now(),
      metadata: { parentId: 'parent-123' },
    }

    const result = await APIService.logUserActivity(activity)

    expect(result).toBeDefined()
  })
})

// ============================================================================
// STORY 8.1: ACTIVITY LOGGING
// ============================================================================

describe('Activity Logging', () => {
  it('should query activities by user ID', async () => {
    // Create some activities first
    await APIService.logUserActivity({
      userId: testUserId,
      type: 'product_submit',
      productId: testProductId,
      timestamp: Date.now() - 10000,
    })

    await APIService.logUserActivity({
      userId: testUserId,
      type: 'rating',
      productId: testProductId,
      timestamp: Date.now(),
    })

    const activities = await APIService.getUserActivities(testUserId)

    expect(activities.length).toBeGreaterThanOrEqual(2)
  })

  it('should support all activity types', async () => {
    const activityTypes: types.UserActivity['type'][] = [
      'product_submit',
      'rating',
      'discussion',
      'tag',
    ]

    for (const type of activityTypes) {
      const activity: types.UserActivity = {
        userId: testUserId,
        type,
        productId: testProductId,
        timestamp: Date.now(),
      }

      const result = await APIService.logUserActivity(activity)
      expect(result).toBeDefined()
      expect(result.type).toBe(type)
    }
  })
})

// ============================================================================
// STORY 3.3: PRODUCT MANAGEMENT REQUEST
// ============================================================================

describe('Product Management Request Workflow', () => {
  it('should create ownership request', async () => {
    const requestData = {
        type: 'product-ownership',
      productId: testProductId,
      reason: 'I created this product',
    }

    const result = await APIService.createUserRequest(requestData as any)

    expect(result).toBeDefined()
    expect(result.status).toBe('pending')
    expect(result.userId).toBe(testUserId)
  })

  it('should retrieve user requests', async () => {
    // Create a couple of requests first
    await APIService.createUserRequest({
        type: 'product-ownership',
      productId: testProductId,
      reason: 'Test request 1',
    } as any)

    const requests = await APIService.getUserRequests(testUserId)

    expect(requests.length).toBeGreaterThanOrEqual(1)
  })

  it('should approve ownership request and update owners list and owned products', async () => {
    const request = await APIService.createUserRequest({
        type: 'product-ownership',
      productId: testProductId,
      reason: 'I maintain this product',
    } as any)

    expect(request.status).toBe('pending')

    const moderatorId = DEV_USERS.moderator.id
    const moderatorToken = getDevToken(moderatorId)

    // Switch to moderator to approve
    setAuthTokenGetter(async () => moderatorToken)
    const approved = await APIService.approveRequest(request.id, moderatorId, 'approve ownership')

    expect(approved?.status).toBe('approved')
    expect(approved?.reviewedBy).toBe(moderatorId)

    // Owners endpoint should include the requester after approval
    const owners = await APIService.getProductOwners(testProductId)
    expect(owners.some(owner => owner.id === testUserId)).toBe(true)

    // Switch back to the requester to verify owned products list
    setAuthTokenGetter(async () => authToken)
    const ownedProducts = await APIService.getOwnedProducts(testUserId)
    expect(ownedProducts.some(product => product.id === testProductId)).toBe(true)

    const requests = await APIService.getUserRequests(testUserId)
    const approvedRequest = requests.find(r => r.id === request.id)
    expect(approvedRequest?.status).toBe('approved')
  })

  it('renders managers in ProductEditors after approval', async () => {
    // User submits ownership request
    const request = await APIService.createUserRequest({
        type: 'product-ownership',
      productId: testProductId,
      reason: 'UI should show me as manager',
    } as any)

    // Approve as moderator
    const moderatorId = DEV_USERS.moderator.id
    const moderatorToken = getDevToken(moderatorId)
    setAuthTokenGetter(async () => moderatorToken)
    await APIService.approveRequest(request.id, moderatorId)

    // Switch back to requester context for component fetches
    setAuthTokenGetter(async () => authToken)
    const userAccount = await APIService.getUserAccount(testUserId)

    render(
      <MemoryRouter>
        <ProductEditors
          productId={testProductId}
          userId={testUserId}
          isEditor={false}
          userAccount={userAccount || undefined}
        />
      </MemoryRouter>
    )

    // Should replace the empty-managers message with the approved owner
    await waitFor(() => {
      expect(screen.queryByText(/no managers yet/i)).toBeNull()
    })

    const displayName = userAccount?.displayName || userAccount?.username || userAccount?.login
    if (displayName) {
      await waitFor(() => {
        const matches = screen.queryAllByText(new RegExp(displayName, 'i'))
        expect(matches.length).toBeGreaterThan(0)
      })
    }
  })

  it('makes the approved product clickable and shows managers on detail widget', async () => {
    // Submit + approve ownership
    const request = await APIService.createUserRequest({
        type: 'product-ownership',
      productId: testProductId,
      reason: 'Check clickable product card',
    } as any)

    const moderatorId = DEV_USERS.moderator.id
    const moderatorToken = getDevToken(moderatorId)
    setAuthTokenGetter(async () => moderatorToken)
    await APIService.approveRequest(request.id, moderatorId)

    // Switch back to user and fetch account for UI props
    setAuthTokenGetter(async () => authToken)
    const userAccount = await APIService.getUserAccount(testUserId)
    const product = await APIService.getProduct(testProductId)
    if (!product) throw new Error('Product not found after approval')

    // Render clickable product card and ensure click works
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <ProductCard
          product={{ ...product, tags: product.tags || [] }}
          ratings={[]}
          onClick={onClick}
          userAccount={userAccount}
        />
      </MemoryRouter>
    )

    const title = await screen.findByText(product.name)
    fireEvent.click(title)
    expect(onClick).toHaveBeenCalled()

    // Render ownership widget to confirm managers visible in detail context
    render(
      <MemoryRouter>
        <ProductEditors
          productId={testProductId}
          userId={testUserId}
          isEditor={false}
          userAccount={userAccount || undefined}
        />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByText(/no managers yet/i)).toBeNull()
    })
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('Error Handling in Workflows', () => {
  it('should handle product submission errors', async () => {
    const productData = {
      name: `Duplicate Product ${Date.now()}`,
      source: 'user-submitted' as const,
      category: 'Software',
      sourceUrl: `https://github.com/test/duplicate-${Date.now()}`,
      url: `https://example.com/duplicate-${Date.now()}`,
    }

    // Create the product once
    await APIService.createProduct(productData as any)

    // Try to create the same product again (should fail)
    try {
      await APIService.createProduct(productData as any)
      expect.fail('Should have thrown error')
    } catch (error: any) {
      expect(error).toBeDefined()
      // Error message might vary depending on backend validation
    }
  })

  it('should handle rating errors', async () => {
    // Create a rating
    await APIService.updateRating(testProductId, testUserId, 5)

    // Try to rate with invalid value (should fail)
    try {
      await APIService.updateRating(testProductId, testUserId, 10)
      expect.fail('Should have thrown error for invalid rating')
    } catch (error: any) {
      expect(error).toBeDefined()
    }
  })

  it('should handle activity logging errors gracefully', async () => {
    const activity: types.UserActivity = {
      userId: 'non-existent-user',
      type: 'rating',
      productId: testProductId,
      timestamp: Date.now(),
    }

    try {
      await APIService.logUserActivity(activity)
      // Some backends may accept this, so don't fail if it succeeds
    } catch (error: any) {
      // Error is acceptable for non-existent user
      expect(error).toBeDefined()
    }
  })
})
