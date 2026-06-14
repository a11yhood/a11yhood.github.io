import { describe, expect, it } from 'vitest'

import { routeNeedsFullProductList } from '@/App'

describe('routeNeedsFullProductList', () => {
  it('returns true for nested admin routes that depend on shared product data', () => {
    expect(routeNeedsFullProductList('/admin')).toBe(true)
    expect(routeNeedsFullProductList('/admin/users')).toBe(true)
    expect(routeNeedsFullProductList('/admin/logs')).toBe(true)
  })

  it('returns true for products and submit routes, and false for detail routes', () => {
    expect(routeNeedsFullProductList('/products')).toBe(true)
    expect(routeNeedsFullProductList('/submit')).toBe(true)
    expect(routeNeedsFullProductList('/products/example-product')).toBe(false)
    expect(routeNeedsFullProductList('/collections/example-collection')).toBe(false)
  })
})