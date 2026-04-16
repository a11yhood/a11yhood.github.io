import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { APIError, APIService, setAuthTokenGetter } from '@/lib/api'
import { ProductEditors } from '@/components/ProductEditors'
import { ProductCard } from '@/components/ProductCard'
import * as types from '@/lib/types'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

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

let testUserId: string
let testProductId: string
let authToken: string
let testUsername = DEV_USERS.user.username

beforeAll(async () => {
  if (!(globalThis as any).__BACKEND_AVAILABLE__) return
  testUserId = DEV_USERS.user.id
  authToken = getDevToken(DEV_USERS.user.role)
  setAuthTokenGetter(async () => authToken)

  const product = await APIService.createProduct({
    name: `Shared Workflow Product ${Date.now()}`,
    description: 'Shared product for user-workflows integration tests',
    type: 'Software',
    sourceUrl: `https://github.com/test/shared-product-${Date.now()}`,
    imageUrl: 'https://example.com/image.png',
  })
  testProductId = product.id
}, 30000)

beforeEach(async () => {
  if (!(globalThis as any).__BACKEND_AVAILABLE__) return
  testUserId = DEV_USERS.user.id
  authToken = getDevToken(DEV_USERS.user.role)

  // Set up the auth token getter for APIService
  setAuthTokenGetter(async () => authToken)

  const me = await APIService.getCurrentUser()
  if (me?.id) testUserId = me.id
  if (me?.username) testUsername = me.username
})

afterEach(async () => {
  if (!(globalThis as any).__BACKEND_AVAILABLE__) return
  // Clean up auth token getter
  setAuthTokenGetter(async () => null)
})

// ============================================================================
// STORY 3.1: USER SUBMITS A NEW PRODUCT
// ============================================================================

describeWithBackend('Product Submission Workflow', () => {
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
    expect(result.source.toLowerCase()).toBe('github')
  }, 20000)

  it('should log activity when product is submitted', async () => {
    const activity: types.UserActivity = {
      userId: testUserId,
      type: 'product_submit',
      productId: testProductId,
      timestamp: new Date().toISOString(),
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

describeWithBackend('Product Rating Workflow', () => {
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
      timestamp: new Date().toISOString(),
      metadata: { rating },
    }

    const activityResult = await APIService.logUserActivity(activity)
    expect(activityResult).toBeDefined()
  })
})

// ============================================================================
// STORY 5.1: USER PARTICIPATES IN DISCUSSIONS
// ============================================================================

describeWithBackend('Discussion Participation Workflow', () => {
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
      timestamp: new Date().toISOString(),
      metadata: { parentId: 'parent-123' },
    }

    const result = await APIService.logUserActivity(activity)
    expect(result).toBeDefined()
  })
})

// ============================================================================
// STORY 8.1: ACTIVITY LOGGING
// ============================================================================

describeWithBackend('Activity Logging', () => {
  it('should query activities by user ID', async () => {
    // Create one activity first
    await APIService.logUserActivity({
      userId: testUserId,
      type: 'product_submit',
      productId: testProductId,
      timestamp: new Date().toISOString(),
    })

    const activities = await APIService.getUserActivities(testUserId)

    expect(activities.length).toBeGreaterThanOrEqual(1)
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
        timestamp: new Date().toISOString(),
      }

      const result = await APIService.logUserActivity(activity)
      expect(result).toBeDefined()
      expect(result.type).toBe(type)
    }
  })
})

// ============================================================================
// STORY 3.3: PRODUCT EDITOR MANAGEMENT
// ============================================================================

describeWithBackend('Product Editor Management Workflow', () => {
  it('should retrieve at least one editor for the product', async () => {
    const owners = await APIService.getProductOwners(testProductId)
    expect(owners.length).toBeGreaterThan(0)
  })

  it('should include the authenticated editor in product owners', async () => {
    const owners = await APIService.getProductOwners(testProductId)
    expect(owners.some(owner => owner.id === testUserId)).toBe(true)
  })

  it('should keep product clickable while editor metadata is present', async () => {
    const userAccount = await APIService.getUserAccount(testUsername)
    const product = await APIService.getProduct(testProductId)
    if (!product) throw new Error('Product not found')

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
  })

  it('renders managers in ProductEditors for detail context', async () => {
    const userAccount = await APIService.getUserAccount(testUsername)

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

  it('shows at least one manager name in the editor widget', async () => {
    const owners = await APIService.getProductOwners(testProductId)
    const firstOwner = owners[0]

    render(
      <MemoryRouter>
        <ProductEditors
          productId={testProductId}
          userId={testUserId}
          isEditor={false}
          userAccount={undefined}
        />
      </MemoryRouter>
    )

    const renderedManagerName = firstOwner?.username || firstOwner?.id
    if (renderedManagerName) {
      await waitFor(() => {
        const matches = screen.queryAllByText(new RegExp(renderedManagerName, 'i'))
        expect(matches.length).toBeGreaterThan(0)
      })
    }
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

describeWithBackend('Error Handling in Workflows', () => {
  it('should handle product submission errors', async () => {
    const invalidProductData = {
      name: `Invalid Product ${Date.now()}`,
      source: 'user-submitted' as const,
      category: 'Software',
      sourceUrl: 'not-a-valid-url',
    }

    // Invalid source URL should be rejected by backend validation.
    await expect(APIService.createProduct(invalidProductData as any)).rejects.toBeDefined()
  })

  it('should handle rating errors', async () => {
    // Create a rating
    await APIService.updateRating(testProductId, testUserId, 5)

    // Try to rate with invalid value (should fail)
    await expect(APIService.updateRating(testProductId, testUserId, 10)).rejects.toBeDefined()
  })

  it('should handle activity logging errors gracefully', async () => {
    const activity: types.UserActivity = {
      userId: 'non-existent-user',
      type: 'rating',
      productId: testProductId,
      timestamp: new Date().toISOString(),
    }

    await expect(APIService.logUserActivity(activity)).rejects.toBeInstanceOf(APIError)
  })
})
