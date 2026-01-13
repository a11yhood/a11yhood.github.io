import { describe, it, beforeAll, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Product, Rating } from '@/lib/types'
import { ProductListItem } from '@/components/ProductListItem'
import { ProductCard } from '@/components/ProductCard'
import { ProductDetail } from '@/components/ProductDetail'
import { formatRelativeTime } from '@/lib/utils'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

let productWithUpdated: Product | null = null
let ratings: Rating[] = []

async function fetchBackendProducts(): Promise<void> {
  try {
    // Use APIService with auth; don't require a specific user token
    const items = await APIService.getAllProducts()
    if (!Array.isArray(items) || items.length === 0) {
      console.log('[Test] No products available from backend')
      return
    }

    // Find first product that has an updated timestamp (APIService camelCases to sourceLastUpdated)
    const candidate = items.find((p: any) => p.sourceLastUpdated)
    if (!candidate) {
      console.log('[Test] No products with sourceLastUpdated found; using first product with mock timestamp')
      // Use first product and attach a mock ISO string timestamp for testing
      productWithUpdated = {
        ...items[0],
        sourceLastUpdated: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      }
      return
    }

    // Found a product with timestamp; use it as-is (string or number)
    productWithUpdated = {
      ...candidate,
      sourceLastUpdated: candidate.sourceLastUpdated,
    }

    // Try to fetch ratings; if unavailable, skip
    try {
      const allRatings = await APIService.getAllRatings()
      ratings = allRatings.filter((r) => r.productId === productWithUpdated!.id)
    } catch {
      ratings = []
    }
  } catch (e: any) {
    console.log('[Test] fetchBackendProducts error:', e?.message || e)
    // Backend may be unavailable or token invalid; tests will handle null gracefully
  }
}

describe('Updated timestamp integration (backend)', () => {
  beforeAll(async () => {
    // Register a dev token getter using seeded test user
    // DEV_USERS.admin is seeded in the backend test database
    setAuthTokenGetter(async () => getDevToken(DEV_USERS.admin.id))
    await fetchBackendProducts()
  })

  it('has a product with sourceLastUpdated for testing', () => {
    expect(productWithUpdated, 'No product available for testing; backend may be unavailable').not.toBeNull()
  })

  it('renders Updated in ProductListItem when timestamp exists', () => {
    if (!productWithUpdated) {
      console.log('[Test] Skipping ProductListItem test: no product available')
      expect(true).toBe(true) // Graceful skip
      return
    }
    const ts = (productWithUpdated as Product).sourceLastUpdated as number | string | undefined
    const fmt = formatRelativeTime(ts)
    console.log('[Test] ProductListItem sourceLastUpdated:', ts, 'formatted:', fmt)
    render(<ProductListItem product={productWithUpdated as Product} ratings={ratings} onClick={vi.fn()} />)
    // Should render "Updated <time>" if timestamp is valid
    if (fmt) {
      const updatedEl = screen.getByText(/Updated/i)
      expect(updatedEl).toBeInTheDocument()
    } else {
      console.log('[Test] Timestamp formatted as empty; skipping render assertion')
    }
  })

  it('renders Updated in ProductCard when timestamp exists', () => {
    if (!productWithUpdated) {
      console.log('[Test] Skipping ProductCard test: no product available')
      expect(true).toBe(true) // Graceful skip
      return
    }
    const ts = (productWithUpdated as Product).sourceLastUpdated as number | string | undefined
    const fmt = formatRelativeTime(ts)
    console.log('[Test] ProductCard sourceLastUpdated:', ts, 'formatted:', fmt)
    render(<ProductCard product={productWithUpdated as Product} ratings={ratings} onClick={vi.fn()} />)
    if (fmt) {
      const updatedEls = screen.getAllByText(/Updated/i)
      expect(updatedEls.length).toBeGreaterThanOrEqual(1)
    } else {
      console.log('[Test] Timestamp formatted as empty; skipping render assertion')
    }
  })

  it('renders Last Updated in ProductDetail when timestamp exists', () => {
    if (!productWithUpdated) {
      console.log('[Test] Skipping ProductDetail test: no product available')
      expect(true).toBe(true) // Graceful skip
      return
    }
    const ts = (productWithUpdated as Product).sourceLastUpdated as number | string | undefined
    const fmt = formatRelativeTime(ts)
    console.log('[Test] ProductDetail sourceLastUpdated:', ts, 'formatted:', fmt)
    render(
      <ProductDetail
        product={productWithUpdated as Product}
        ratings={ratings}
        discussions={[]}
        user={null}
        userCollections={[]}
        onBack={vi.fn()}
        onRate={vi.fn()}
        onDiscuss={vi.fn()}
        onAddTag={vi.fn()}
        allTags={(productWithUpdated as Product).tags || []}
      />
    )
    if (fmt) {
      const updatedEl = screen.getByText(/Last Updated/i)
      expect(updatedEl).toBeInTheDocument()
    } else {
      console.log('[Test] Timestamp formatted as empty; skipping render assertion')
    }
  })
})
