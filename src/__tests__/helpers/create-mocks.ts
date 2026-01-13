/**
 * Shared test helpers for creating mock data
 * 
 * These helpers create mock objects that match the current type definitions.
 * Use these instead of hardcoding mock data in test files.
 */

import type { UserAccount, Product, Rating, Discussion } from '@/lib/types'

/**
 * Create a mock UserAccount with sensible defaults
 */
export function createMockUserAccount(overrides?: Partial<UserAccount>): UserAccount {
  return {
    id: 'test-user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock admin UserAccount
 */
export function createMockAdminAccount(overrides?: Partial<UserAccount>): UserAccount {
  return createMockUserAccount({
    id: 'test-admin-1',
    username: 'admin',
    role: 'admin',
    ...overrides,
  })
}

/**
 * Create a mock Product with sensible defaults
 */
export function createMockProduct(overrides?: Partial<Product>): Product {
  return {
    id: 'product-1',
    name: 'Test Product',
    type: 'Software',
    source: 'GitHub',
    description: 'A test product for testing',
    tags: ['test', 'accessibility'],
    createdAt: Date.now(),
    sourceUrl: 'https://github.com/test/repo',
    ...overrides,
  }
}

/**
 * Create a mock Rating with sensible defaults
 */
export function createMockRating(overrides?: Partial<Rating>): Rating {
  return {
    productId: 'product-1',
    userId: 'test-user-1',
    rating: 5,
    createdAt: Date.now(),
    ...overrides,
  }
}

/**
 * Create a mock Discussion with sensible defaults
 */
export function createMockDiscussion(overrides?: Partial<Discussion>): Discussion {
  return {
    id: 'discussion-1',
    productId: 'product-1',
    userId: 'test-user-1',
    userName: 'testuser',
    content: 'This is a test discussion',
    createdAt: Date.now(),
    ...overrides,
  }
}
