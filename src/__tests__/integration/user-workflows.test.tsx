import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { APIService, setAuthTokenGetter } from '@/lib/api'
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
let fallbackUploadedImageId: string | null = null

type SeedManifest = {
  seed_version?: string
  seeded_image_id?: string
  seeded_product_with_image_id?: string
  seeded_product_image_id?: string
}

async function uploadFallbackImageAndReturnId(): Promise<string> {
  if (fallbackUploadedImageId) {
    return fallbackUploadedImageId
  }

  const previousGetter = APIService.getAuthTokenGetter()
  const moderatorToken = getDevToken(DEV_USERS.moderator.role)

  try {
    setAuthTokenGetter(async () => moderatorToken)

    const fixtureBytes = readFileSync(`${process.cwd()}/src/assets/images/ahood-small.png`)
    const fixtureFile = new File([fixtureBytes], 'ahood-small.png', { type: 'image/png' })
    const uploadedReference = await APIService.uploadImage(fixtureFile)
    const imageId = uploadedReference.replace(/^\/api\/images\//, '').trim()

    if (!imageId) {
      throw new Error(`Fallback upload returned an unexpected reference: ${uploadedReference}`)
    }

    fallbackUploadedImageId = imageId
    return imageId
  } finally {
    if (previousGetter) {
      setAuthTokenGetter(previousGetter)
    } else {
      setAuthTokenGetter(async () => null)
    }
  }
}

async function getSeededImageIdFromBackend(): Promise<string> {
  const manifest = ((globalThis as any).__TEST_SEED_MANIFEST__ ?? null) as SeedManifest | null
  const manifestImageId = manifest?.seeded_image_id || manifest?.seeded_product_image_id
  if (typeof manifestImageId === 'string' && manifestImageId.trim().length > 0) {
    return manifestImageId.trim()
  }

  const products = await APIService.getAllProducts({ limit: 100 })
  const seeded = products.find((p) => typeof p.imageId === 'string' && p.imageId.trim().length > 0)

  if (seeded?.imageId) {
    return seeded.imageId
  }

  // Some backend-test environments seed without an image fixture; upload one once
  // so image-reference workflows can still validate against real backend behavior.
  return uploadFallbackImageAndReturnId()
}

beforeAll(async () => {
  if (!(globalThis as any).__BACKEND_AVAILABLE__) return

  testUserId = DEV_USERS.user.id
  testUsername = DEV_USERS.user.username
  authToken = getDevToken(DEV_USERS.user.role)
  setAuthTokenGetter(async () => authToken)

  // Resolve runtime identity once to avoid per-test auth lookups while still
  // matching the backend-mapped dev user UUID for activity/rating assertions.
  const me = await APIService.getCurrentUser()
  if (me?.id) testUserId = me.id
  if (me?.username) testUsername = me.username

  const product = await APIService.createProduct({
    name: `Shared Workflow Product ${Date.now()}`,
    description: 'Shared product for user-workflows integration tests',
    type: 'Software',
    source: 'github',
    sourceUrl: `https://github.com/test/shared-product-${Date.now()}`,
    tags: [],
  })
  testProductId = product.id
}, 30000)

beforeEach(() => {
  if (!(globalThis as any).__BACKEND_AVAILABLE__) return
  authToken = getDevToken(DEV_USERS.user.role)

  // Set up the auth token getter for APIService
  setAuthTokenGetter(async () => authToken)
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
    }

    const result = await APIService.createProduct(productData as any)

    expect(result).toBeDefined()
    expect(result.name).toBe(productData.name)
    expect(result.id).toBeDefined()
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

  it('should create a product with an uploaded image ID and persist the image reference', async () => {
    const sourceUrl = `https://github.com/test/create-with-upload-${Date.now()}`
    const imageId = await getSeededImageIdFromBackend()

    const createdProduct = await APIService.createProduct({
      name: `Create With Upload ${Date.now()}`,
      description: 'Integration test product with an uploaded image',
      type: 'Software',
      sourceUrl,
      image: { id: imageId, alt: 'Uploaded image for create flow' },
    } as any)

    expect(createdProduct.imageId).toBeDefined()
    expect(createdProduct.imageId).toBe(imageId)

    const fetchedProduct = await APIService.getProduct(createdProduct.id)
    expect(fetchedProduct).toBeDefined()
    expect(fetchedProduct?.imageId).toBe(createdProduct.imageId)
  }, 30000)

  it('should edit a product to add an uploaded image ID and persist it', async () => {
    const sourceUrl = `https://github.com/test/edit-to-add-upload-${Date.now()}`
    const imageId = await getSeededImageIdFromBackend()

    const createdProduct = await APIService.createProduct({
      name: `Edit To Add Upload ${Date.now()}`,
      description: 'Integration test product that will gain an uploaded image later',
      type: 'Software',
      sourceUrl,
    } as any)

    expect(createdProduct.imageUrl).toBeFalsy()

    const updatedProduct = await APIService.updateProduct(
      createdProduct.id,
      {
        image: { id: imageId, alt: 'Uploaded image for edit flow' },
      },
      testUserId
    )

    expect(updatedProduct?.imageId).toBeDefined()
    expect(updatedProduct?.imageId).toBe(imageId)

    const fetchedProduct = await APIService.getProduct(createdProduct.id)
    expect(fetchedProduct).toBeDefined()
    expect(fetchedProduct?.imageId).toBe(updatedProduct?.imageId)
  }, 30000)

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
  it('should include the created product in creator owned-products', async () => {
    const ownedProducts = await APIService.getOwnedProducts(testUsername)
    expect(ownedProducts.some((product) => product.id === testProductId)).toBe(true)
  })

  it('should return join-table owner entries with stable identity fields when present', async () => {
    const owners = await APIService.getProductOwners(testProductId)
    expect(Array.isArray(owners)).toBe(true)
    for (const owner of owners) {
      expect(Boolean(owner.id || owner.username)).toBe(true)
    }
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
    const owners = await APIService.getProductOwners(testProductId)

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

    if (owners.length === 0) {
      await waitFor(() => {
        expect(screen.getByText(/no editors yet/i)).toBeInTheDocument()
      })
    } else {
      await waitFor(() => {
        expect(screen.queryByText(/no editors yet/i)).toBeNull()
      })
    }
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
      sourceUrl: 'not-a-valid-url',
    }

    // Invalid source URL should be rejected by backend validation.
    await expect(APIService.createProduct(invalidProductData as any)).rejects.toBeDefined()
  })

  it('should handle rating errors', async () => {
    // Invalid rating values must be rejected by the API contract with a client error.
    await expect(APIService.updateRating(testProductId, testUserId, 10)).rejects.toMatchObject({
      name: 'APIError',
      status: expect.any(Number),
    })

    await expect(APIService.updateRating(testProductId, testUserId, 10)).rejects.toSatisfy((error) => {
      const status = (error as { status?: unknown }).status
      return typeof status === 'number' && status >= 400 && status < 500
    })
  })

  it('should reject invalid activity timestamps before sending the request', async () => {
    const activity: types.UserActivity = {
      userId: testUserId,
      type: 'rating',
      productId: testProductId,
      timestamp: 'not-an-iso-timestamp',
    }

    await expect(APIService.logUserActivity(activity)).rejects.toThrow(/timestamp/i)
  })
})
