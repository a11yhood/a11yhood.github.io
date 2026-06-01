import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductDetail } from '@/components/ProductDetail'
import { createMockProduct } from '../helpers/create-mocks'

describe('ProductDetail rating section', () => {
  const product = createMockProduct({ slug: 'test-product' })
  const baseProps = {
    product,
    ratings: [],
    discussions: [],
    userCollections: [],
    onBack: vi.fn(),
    onRate: vi.fn(),
    onDiscuss: vi.fn(),
    onAddTag: vi.fn(),
    allTags: [],
  }

  it('shows a login CTA for anonymous users and forwards current path', () => {
    const onRequireLogin = vi.fn()
    window.history.pushState({}, '', '/product/test-product?source=test#ratings')

    render(
      <MemoryRouter>
        <ProductDetail
          {...baseProps}
          user={null}
          onRequireLogin={onRequireLogin}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Rating' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your Rating' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in to rate this project' }))

    expect(onRequireLogin).toHaveBeenCalledWith('/product/test-product?source=test#ratings')
  })

  it('shows "Your Rating" for signed-in users', () => {
    render(
      <MemoryRouter>
        <ProductDetail
          {...baseProps}
          user={{ id: 'user-1', username: 'test-user', avatarUrl: '' } as any}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Your Rating' })).toBeInTheDocument()
  })
})
