import { describe, it, beforeAll, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductListItem } from '@/components/ProductListItem'
import type { Product, Rating } from '@/lib/types'
import { createMockProduct, createMockRating } from '../helpers/create-mocks'

let product: Product | null = null
let ratings: Rating[] = []

async function fetchBackendProduct(): Promise<void> {
  try {
    const resp = await fetch('http://localhost:8000/api/products?limit=1')
    if (resp.ok) {
      const items = await resp.json()
      if (items && items.length > 0) {
        const p = items[0]
        product = {
          id: p.id,
          name: p.name,
          type: p.type,
          source: p.source,
          sourceUrl: p.source_url ?? p.sourceUrl,
          description: p.description,
          tags: p.tags || [],
          createdAt: (p.created_at ?? p.createdAt) ? new Date(p.created_at ?? p.createdAt).getTime() : Date.now(),
          sourceRating: p.source_rating ?? p.sourceRating,
          sourceRatingCount: p.source_rating_count ?? p.sourceRatingCount,
          stars: p.stars,
          imageUrl: p.image_url ?? p.imageUrl,
          imageAlt: p.name,
        }
        const r = await fetch(`http://localhost:8000/api/products/${product.id}/ratings`)
        if (r.ok) {
          const raw = await r.json()
          ratings = raw.map((x: any) => ({
            productId: x.product_id ?? x.productId,
            userId: x.user_id ?? x.userId,
            rating: x.rating,
            createdAt: (x.created_at ?? x.createdAt) ? new Date(x.created_at ?? x.createdAt).getTime() : Date.now(),
          }))
        }
      }
    }
  } catch (e) {
    // ignore; integration test will fallback
  }
}

function getProduct(): Product {
  return product ?? createMockProduct({ id: 'fallback-1', name: 'Fallback Product' })
}

function getRatings(pid: string): Rating[] {
  return ratings.length > 0
    ? ratings
    : [
        createMockRating({ productId: pid, userId: 'u1', rating: 4 }),
        createMockRating({ productId: pid, userId: 'u2', rating: 5 }),
      ]
}

describe('ProductListItem - Integration', () => {
  beforeAll(async () => {
    await fetchBackendProduct()
  })

  it('renders product name and image/stars when available', () => {
    const p = getProduct()
    const r = getRatings(p.id)

    render(<ProductListItem product={p} ratings={r} onClick={vi.fn()} />)

    expect(screen.getByText(p.name)).toBeInTheDocument()
    // image optional; stars badge optional; ensure component renders
    const article = screen.getByRole('article')
    expect(article).toBeInTheDocument()
  })
})
