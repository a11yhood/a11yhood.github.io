import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen } from '@testing-library/react'
import { ProductListItem } from '@/components/ProductListItem'
import type { Product } from '@/lib/types'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { getValidProductType } from '../testData'

let product: Product
const API_BASE = (globalThis as any).__TEST_API_BASE__

describeWithBackend('ProductListItem - Integration', () => {
  beforeAll(async () => {
    const adminToken = getDevToken(DEV_USERS.admin.id)
    setAuthTokenGetter(async () => adminToken)

    product = await APIService.createProduct({
      name: `ProductListItem Integration ${Date.now()}`,
      type: getValidProductType('user-submitted'),
      source: 'user-submitted',
      category: 'Software',
      sourceUrl: `https://github.com/test/product-list-item-${Date.now()}`,
      description: 'Integration fixture for ProductListItem rendering',
      tags: ['integration'],
    } as any)
  }, 20000)

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
        `[ProductListItem.integration.test] Cleanup failed for product ${product.id}: ${response.status} ${response.statusText} ${details}`
      )
    }
  })

  it('renders product name and image/stars when available', () => {
    render(<ProductListItem product={product} ratings={[]} onClick={vi.fn()} />)

    expect(screen.getByText(product.name)).toBeInTheDocument()
    // image optional; stars badge optional; ensure component renders
    const article = screen.getByRole('article')
    expect(article).toBeInTheDocument()
  })
})
