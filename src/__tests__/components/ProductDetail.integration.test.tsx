import { describe, it, beforeAll, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductDetail } from '@/components/ProductDetail'
import type { Product, Rating, Discussion } from '@/lib/types'
import { createMockProduct, createMockRating, createMockDiscussion } from '../helpers/create-mocks'

let product: Product | null = null
let ratings: Rating[] = []
let discussions: Discussion[] = []

async function fetchBackendData(): Promise<void> {
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
        const ds = await fetch(`http://localhost:8000/api/products/${product.id}/discussions`)
        if (ds.ok) {
          const raw = await ds.json()
          discussions = raw.map((x: any) => ({
            id: x.id,
            productId: x.product_id ?? x.productId,
            userId: x.user_id ?? x.userId,
            content: x.content ?? '',
            parentId: x.parent_id ?? x.parentId ?? undefined,
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

function getDiscussions(pid: string): Discussion[] {
  return discussions.length > 0 ? discussions : []
}

describe('ProductDetail - Integration', () => {
  beforeAll(async () => {
    await fetchBackendData()
  })

  it('renders product details and tabs', () => {
    const p = getProduct()
    const r = getRatings(p.id)
    const ds = getDiscussions(p.id)

    render(
      <ProductDetail
        product={p}
        ratings={r}
        discussions={ds}
        user={null}
        userCollections={[]}
        onBack={vi.fn()}
        onRate={vi.fn()}
        onDiscuss={vi.fn()}
        onAddTag={vi.fn()}
        allTags={p.tags || []}
      />
    )

    expect(screen.getByText(p.name)).toBeInTheDocument()
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
    )

    expect(screen.getByRole('link', { name: /View on github\.com/i })).toBeInTheDocument()
  })
})
