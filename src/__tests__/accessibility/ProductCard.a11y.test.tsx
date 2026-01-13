import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from '@/components/ProductCard'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import type { Product, Rating, UserAccount } from '@/lib/types'

// Uses real API data (dev-token) per Agent Guide accessibility testing requirements.

describe('ProductCard Accessibility Tests', () => {
  const testUserId = DEV_USERS.user.id
  const adminUserId = DEV_USERS.admin.id
  const productSourceUrl = `https://github.com/test/a11y-product-${Date.now()}`

  let product: Product
  let ratings: Rating[]
  let adminAccount: UserAccount
  let regularAccount: UserAccount

  beforeAll(async () => {
    // Create test users
    APIService.setAuthTokenGetter(async () => getDevToken(testUserId))
    adminAccount = {
      id: adminUserId,
      username: DEV_USERS.admin.login,
      avatarUrl: 'https://example.com/avatar-admin.jpg',
      role: 'admin',
      email: DEV_USERS.admin.email,
    } as UserAccount

    regularAccount = {
      id: testUserId,
      username: DEV_USERS.user.login,
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'user',
      email: DEV_USERS.user.email,
    } as UserAccount

    // Create product
    product = await APIService.createProduct({
      name: 'Accessible Widget',
      type: 'Software',
      sourceUrl: productSourceUrl,
      description: 'A test accessible widget with sufficient description for testing purposes',
      tags: ['accessibility', 'test'],
    })

    // Create ratings from two users
    ratings = []
    APIService.setAuthTokenGetter(async () => getDevToken(testUserId))
    ratings.push(
      await APIService.createRating({
        productId: product.id,
        userId: testUserId,
        rating: 4,
        createdAt: Date.now(),
      })
    )

    APIService.setAuthTokenGetter(async () => getDevToken(adminUserId))
    ratings.push(
      await APIService.createRating({
        productId: product.id,
        userId: adminUserId,
        rating: 5,
        createdAt: Date.now(),
      })
    )

    // Default auth back to regular user for render flows
    APIService.setAuthTokenGetter(async () => getDevToken(testUserId))
  })

  afterAll(async () => {
    try {
      await APIService.deleteProduct(product.id)
    } catch {}
  })

  it('should have proper ARIA article role', () => {
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={vi.fn()}
        userAccount={regularAccount}
        onDelete={vi.fn()}
      />
    )

    const article = screen.getByRole('article')
    expect(article).toBeInTheDocument()
  })

  it('should have accessible product name heading', () => {
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={vi.fn()}
        userAccount={regularAccount}
        onDelete={vi.fn()}
      />
    )

    const heading = screen.getByRole('heading', { name: product.name })
    expect(heading).toBeInTheDocument()
  })

  it('should display average rating with accessible text', () => {
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={vi.fn()}
        userAccount={regularAccount}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText(/4\.5/)).toBeInTheDocument()
  })

  it('should have keyboard-accessible card click', () => {
    const handleClick = vi.fn()
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={handleClick}
        userAccount={regularAccount}
        onDelete={vi.fn()}
      />
    )

    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('tabIndex')
  })

  it('should display product type', () => {
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={vi.fn()}
        userAccount={regularAccount}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText(product.type)).toBeInTheDocument()
  })

  it('should show delete button for admins', () => {
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={vi.fn()}
        userAccount={adminAccount}
        onDelete={vi.fn()}
      />
    )

    const deleteButton = screen.getByLabelText(/delete product/i)
    expect(deleteButton).toBeInTheDocument()
  })

  it('should not show delete button for non-admins', () => {
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={vi.fn()}
        userAccount={regularAccount}
        onDelete={vi.fn()}
      />
    )

    const deleteButton = screen.queryByLabelText(/delete product/i)
    expect(deleteButton).not.toBeInTheDocument()
  })

  it('should display all product tags', () => {
    render(
      <ProductCard
        product={product}
        ratings={ratings}
        onClick={vi.fn()}
        userAccount={regularAccount}
        onDelete={vi.fn()}
      />
    )

    product.tags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument()
    })
  })
})
