import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScraperManager } from '@/components/ScraperManager'
import type { Product } from '@/lib/types'

const products: Product[] = [
  {
    id: 'p1',
    name: 'Test Product',
    type: 'tool',
    source: 'User-Submitted',
    description: 'desc',
    tags: [],
    createdAt: Date.now(),
    banned: false,
  },
]

describe('ScraperManager ban/unban controls gated by role', () => {
  it('shows ban button for moderators', () => {
    render(
      <ScraperManager
        products={products}
        onProductsUpdate={() => {}}
        role="moderator"
        currentUserId="u1"
      />
    )

    // Ban button appears (ghost button with title 'Ban product')
    expect(screen.getAllByTitle(/Ban product|Unban product/).length).toBeGreaterThan(0)
  })

  it('hides ban button for regular users', () => {
    render(
      <ScraperManager
        products={products}
        onProductsUpdate={() => {}}
        role="user"
        currentUserId="u1"
      />
    )

    expect(screen.queryByTitle(/Ban product|Unban product/)).toBeNull()
  })
})
