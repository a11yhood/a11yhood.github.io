import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductDetail } from '@/components/ProductDetail'
import { APIService } from '@/lib/api'
import { createMockProduct } from '../helpers/create-mocks'

describe('ProductDetail rating section', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

    const loginCtas = screen.getAllByRole('button', { name: 'Sign in to rate this product' })
    expect(loginCtas.length).toBeGreaterThan(0)

    fireEvent.click(loginCtas[0])
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to add tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to add to collection' }))

    expect(onRequireLogin).toHaveBeenNthCalledWith(1, '/product/test-product?source=test#ratings')
    expect(onRequireLogin).toHaveBeenNthCalledWith(2, '/product/test-product?source=test#ratings')
    expect(onRequireLogin).toHaveBeenNthCalledWith(3, '/product/test-product?source=test#ratings')
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
    expect(screen.getByText('Rate this product')).toBeInTheDocument()
  })

  it('loads authenticated collections when user and userAccount usernames match', async () => {
    const getUserCollectionsSpy = vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([])

    render(
      <MemoryRouter>
        <ProductDetail
          {...baseProps}
          user={{ id: 'user-1', username: 'test-user', avatarUrl: '' } as any}
          userAccount={{ id: 'user-1', username: 'test-user', role: 'user' } as any}
        />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getUserCollectionsSpy).toHaveBeenCalled()
    })
  })

  it('does not load /collections when user and userAccount usernames mismatch', async () => {
    const getUserCollectionsSpy = vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([])

    render(
      <MemoryRouter>
        <ProductDetail
          {...baseProps}
          user={{ id: 'user-1', username: 'test-user', avatarUrl: '' } as any}
          userAccount={{ id: 'user-1', username: 'other-user', role: 'user' } as any}
        />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getUserCollectionsSpy).not.toHaveBeenCalled()
    })
  })
})
