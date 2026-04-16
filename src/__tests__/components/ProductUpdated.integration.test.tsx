import { it, beforeAll, afterAll, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describeWithBackend } from '../helpers/with-backend'
import type { Product, Rating } from '@/lib/types'
import { ProductListItem } from '@/components/ProductListItem'
import { ProductCard } from '@/components/ProductCard'
import { ProductDetail } from '@/components/ProductDetail'
import { formatRelativeTime } from '@/lib/utils'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { getValidProductType } from '../testData'

let productWithUpdated: Product
let ratings: Rating[] = []
const API_BASE = (globalThis as any).__TEST_API_BASE__

describeWithBackend('Updated timestamp integration (backend)', () => {
  beforeAll(async () => {
    const adminToken = getDevToken(DEV_USERS.admin.id)
    setAuthTokenGetter(async () => adminToken)

    const created = await APIService.createProduct({
      name: `Updated Timestamp Integration ${Date.now()}`,
      type: getValidProductType('user-submitted'),
      source: 'user-submitted',
      category: 'Software',
      sourceUrl: `https://github.com/test/updated-timestamp-${Date.now()}`,
      description: 'Integration fixture with deterministic updated timestamp',
      tags: ['integration', 'updated'],
    } as any)

    // Keep backend-backed product data and set explicit timestamp under test.
    productWithUpdated = {
      ...created,
      sourceLastUpdated: new Date(Date.now() - 3600000).toISOString(),
    }
    ratings = []
  })

  afterAll(async () => {
    if (!productWithUpdated?.id) return

    const response = await fetch(`${API_BASE}/products/${productWithUpdated.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getDevToken(DEV_USERS.admin.id)}`,
      },
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      console.warn(
        `[ProductUpdated.integration.test] Cleanup failed for product ${productWithUpdated.id}: ${response.status} ${response.statusText} ${details}`
      )
    }
  })

  it('has a product with sourceLastUpdated for testing', () => {
    expect(productWithUpdated).toBeDefined()
  })

  it('renders Updated in ProductListItem when timestamp exists', () => {
    const ts = productWithUpdated.sourceLastUpdated as number | string | undefined
    const fmt = formatRelativeTime(ts)
    console.log('[Test] ProductListItem sourceLastUpdated:', ts, 'formatted:', fmt)
    render(<ProductListItem product={productWithUpdated as Product} ratings={ratings} onClick={vi.fn()} />)
    expect(fmt).toBeTruthy()
    const updatedEls = screen.getAllByText(/Updated/i)
    expect(updatedEls.length).toBeGreaterThan(0)
  })

  it('renders Updated in ProductCard when timestamp exists', () => {
    const ts = productWithUpdated.sourceLastUpdated as number | string | undefined
    const fmt = formatRelativeTime(ts)
    console.log('[Test] ProductCard sourceLastUpdated:', ts, 'formatted:', fmt)
    render(<ProductCard product={productWithUpdated as Product} ratings={ratings} onClick={vi.fn()} />)
    expect(fmt).toBeTruthy()
    const updatedEls = screen.getAllByText(/Updated/i)
    expect(updatedEls.length).toBeGreaterThanOrEqual(1)
  })

  it('renders Last Updated in ProductDetail when timestamp exists', () => {
    const ts = productWithUpdated.sourceLastUpdated as number | string | undefined
    const fmt = formatRelativeTime(ts)
    console.log('[Test] ProductDetail sourceLastUpdated:', ts, 'formatted:', fmt)
    render(
      <MemoryRouter>
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
      </MemoryRouter>
    )
    expect(fmt).toBeTruthy()
    const updatedEl = screen.getByText(/Last Updated/i)
    expect(updatedEl).toBeInTheDocument()
  })
})
