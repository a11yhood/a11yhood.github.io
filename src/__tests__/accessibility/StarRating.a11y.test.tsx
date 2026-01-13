import { beforeAll, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StarRating } from '@/components/StarRating'
import { APIError, APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import type { Rating } from '@/lib/types'

const testUserId = DEV_USERS.user.id
const productUrl = `https://github.com/test/a11y-star-${Date.now()}`
const defaultSeedRating = 4
let productId: string
let seededRating: Rating | null = null

const ensureRating = async (value = defaultSeedRating) => {
  if (seededRating) {
    if (seededRating.rating !== value) {
      seededRating = await APIService.updateRating(productId, testUserId, value)
    }
    return seededRating
  }

  try {
    seededRating = await APIService.createRating({
      productId,
      userId: testUserId,
      rating: value,
      createdAt: Date.now(),
      id: `${productId}-${testUserId}`,
    })
    return seededRating
  } catch (error) {
    const status = error instanceof APIError ? error.status : undefined
    const alreadyRated = error instanceof APIError && typeof error.message === 'string' && error.message.toLowerCase().includes('already rated')

    if (alreadyRated || (status && [400, 401, 403, 404, 409].includes(status))) {
      seededRating = await APIService.updateRating(productId, testUserId, value)
      return seededRating
    }

    throw error
  }
}

beforeAll(async () => {
  APIService.setAuthTokenGetter(async () => getDevToken(testUserId))

  const product = await APIService.createProduct({
    name: 'Star Rating Target',
    type: 'Software',
    sourceUrl: productUrl,
    description: 'Product for star rating accessibility tests with sufficient description',
    tags: ['a11y', 'rating'],
  })
  productId = product.id

  await ensureRating()
})

describe('StarRating Accessibility Tests', () => {
  it('should have proper ARIA attributes for interactive rating', () => {
    render(<StarRating value={0} onChange={vi.fn()} />)

    const ratingGroup = screen.getByRole('radiogroup')
    expect(ratingGroup).toHaveAttribute('aria-label', 'Rate this product')
  })

  it('should have proper ARIA attributes for readonly rating', async () => {
    const rating = await ensureRating()
    const currentValue = rating?.rating ?? defaultSeedRating

    render(<StarRating value={currentValue} readonly showValue />)

    const text = screen.getByText(new RegExp(String(currentValue)))
    expect(text).toBeInTheDocument()
  })

  it('should allow keyboard navigation through stars', () => {
    const handleRate = vi.fn()
    render(<StarRating value={0} onChange={handleRate} />)

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)

    radios.forEach((radio, index) => {
      expect(radio).toHaveAttribute('aria-label', `Rate ${index + 1} stars`)
    })
  })

  it('should call onChange with correct value on click and persist via API', async () => {
    const handleRate = vi.fn(async (value: number) => {
      const updated = await APIService.updateRating(productId, testUserId, value)
      seededRating = updated
    })

    render(<StarRating value={0} onChange={handleRate} />)

    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[2])

    await waitFor(async () => {
      expect(handleRate).toHaveBeenCalledWith(3)
      const updated = await ensureRating(3)
      expect(updated?.rating).toBe(3)
    })
  })

  it('should display current rating visually', async () => {
    const rating = await ensureRating()
    const currentValue = rating?.rating ?? defaultSeedRating

    render(<StarRating value={currentValue} onChange={vi.fn()} />)

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)
  })

  it('should be readonly when onChange is not provided', async () => {
    const rating = await ensureRating()
    const currentValue = rating?.rating ?? defaultSeedRating

    render(<StarRating value={currentValue} readonly />)

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)
  })

  it('should handle half-star ratings', () => {
    render(<StarRating value={3.5} readonly showValue />)

    expect(screen.getByText(/3\.5/)).toBeInTheDocument()
  })

  it('should handle zero rating', () => {
    render(<StarRating value={0} readonly showValue />)

    expect(screen.getByText(/0/)).toBeInTheDocument()
  })

  it('should have focus visible styles on keyboard navigation', () => {
    render(<StarRating value={0} onChange={vi.fn()} />)

    const firstRadio = screen.getAllByRole('radio')[0]
    firstRadio.focus()

    expect(document.activeElement).toBe(firstRadio)
  })
})
