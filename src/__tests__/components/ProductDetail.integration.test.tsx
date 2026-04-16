import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductDetail } from '@/components/ProductDetail'
import type { Product } from '@/lib/types'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { getValidProductType } from '../testData'
import { createMockProduct } from '../helpers/create-mocks'

let product: Product
const API_BASE = (globalThis as any).__TEST_API_BASE__

describeWithBackend('ProductDetail - Integration', () => {
  beforeAll(async () => {
    const adminToken = getDevToken(DEV_USERS.admin.id)
    setAuthTokenGetter(async () => adminToken)

    product = await APIService.createProduct({
      name: `ProductDetail Integration ${Date.now()}`,
      type: getValidProductType('user-submitted'),
      source: 'user-submitted',
      category: 'Software',
      sourceUrl: `https://github.com/test/product-detail-${Date.now()}`,
      description: 'Integration fixture for ProductDetail rendering',
      tags: ['integration'],
    } as any)
  })

  afterAll(async () => {
    if (!product?.id) return

    const response = await fetch(`${API_BASE}/products/${product.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getDevToken(DEV_USERS.admin.id)}`,
      },
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      console.warn(
        `[ProductDetail.integration.test] Cleanup failed for product ${product.id}: ${response.status} ${response.statusText} ${details}`
      )
    }
  })

  it('renders product details and tabs', () => {
    render(
      <MemoryRouter>
        <ProductDetail
          product={product}
          ratings={[]}
          discussions={[]}
          user={null}
          userCollections={[]}
          onBack={vi.fn()}
          onRate={vi.fn()}
          onDiscuss={vi.fn()}
          onAddTag={vi.fn()}
          allTags={product.tags || []}
        />
      </MemoryRouter>
    )

    expect(screen.getByText(product.name)).toBeInTheDocument()
    // Key sections exist
    expect(screen.getByRole('heading', { name: /Your Rating/i })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: /Discussion/i }).length).toBeGreaterThan(0)
  })

  it('shows canonical host in source link', () => {
    const p = createMockProduct({
      id: 'host-check',
      name: 'Canonical Host Product',
      source: 'GitHub',
      sourceUrl: 'https://github.com/example/repo',
    })

    render(
      <MemoryRouter>
        <ProductDetail
          product={p}
          ratings={[]}
          discussions={[]}
          user={null}
          userCollections={[]}
          onBack={vi.fn()}
          onRate={vi.fn()}
          onDiscuss={vi.fn()}
          onAddTag={vi.fn()}
          allTags={[]}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /View on github\.com/i })).toBeInTheDocument()
  })
})
