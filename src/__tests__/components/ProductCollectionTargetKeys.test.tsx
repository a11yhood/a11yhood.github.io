import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProductCard } from '@/components/ProductCard'
import { ProductListItem } from '@/components/ProductListItem'
import { createMockProduct } from '../helpers/create-mocks'

describe('product collection target keys', () => {
  it('ProductCard opens add-to-collection with the product slug when available', async () => {
    const user = userEvent.setup()
    const onOpenAddToCollection = vi.fn()
    const product = createMockProduct({ id: 'product-1', slug: 'product-slug', name: 'Product Card Target' })

    render(
      <MemoryRouter>
        <ProductCard
          product={product}
          ratings={[]}
          collections={[]}
          onClick={vi.fn()}
          onOpenAddToCollection={onOpenAddToCollection}
        />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /add product card target to collection/i }))

    expect(onOpenAddToCollection).toHaveBeenCalledWith(['product-slug'])
  })

  it('ProductListItem opens add-to-collection with the product slug when available', async () => {
    const user = userEvent.setup()
    const onOpenAddToCollection = vi.fn()
    const product = createMockProduct({ id: 'product-2', slug: 'product-list-slug', name: 'Product List Target' })

    render(
      <MemoryRouter>
        <ProductListItem
          product={product}
          ratings={[]}
          collections={[]}
          onNavigate={vi.fn()}
          onOpenAddToCollection={onOpenAddToCollection}
        />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /add product list target to collection/i }))

    expect(onOpenAddToCollection).toHaveBeenCalledWith(['product-list-slug'])
  })
})