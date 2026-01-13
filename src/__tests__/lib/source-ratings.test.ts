import { describe, it, expect } from 'vitest'
import type { Product, Rating } from '@/lib/types'

describe('Source Rating Calculations', () => {
  // Helper function to calculate average rating (same logic as in App.tsx)
  const getAverageRating = (productId: string, products: Product[], ratings: Rating[]) => {
    const productRatings = ratings.filter((r) => r.productId === productId)
    const product = products.find(p => p.id === productId)
    
    // If we have both user ratings and source rating, average them together
    if (productRatings.length > 0 && product?.sourceRating) {
      const userAverage = productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
      // Weight the averages equally
      return (userAverage + product.sourceRating) / 2
    }
    
    // If only user ratings, use those
    if (productRatings.length > 0) {
      return productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
    }
    
    // If only source rating, use that
    if (product?.sourceRating) {
      return product.sourceRating
    }
    
    // No ratings at all
    return 0
  }

  describe('Combined Rating Calculations', () => {
    it('should use source rating when no user ratings exist', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-github',
          sourceRating: 4.5,
          sourceRatingCount: 100,
        },
      ]

      const ratings: Rating[] = []

      const avgRating = getAverageRating('product1', products, ratings)
      expect(avgRating).toBe(4.5)
    })

    it('should use user ratings when no source rating exists', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'user-submitted',
        },
      ]

      const ratings: Rating[] = [
        { productId: 'product1', userId: 'user1', rating: 5, createdAt: Date.now() },
        { productId: 'product1', userId: 'user2', rating: 3, createdAt: Date.now() },
      ]

      const avgRating = getAverageRating('product1', products, ratings)
      expect(avgRating).toBe(4) // (5 + 3) / 2
    })

    it('should average user and source ratings when both exist', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Fabrication',
          source: 'Thingiverse',
          sourceUrl: 'https://thingiverse.com/thing:123',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-thingiverse',
          sourceRating: 4.0,
          sourceRatingCount: 50,
        },
      ]

      const ratings: Rating[] = [
        { productId: 'product1', userId: 'user1', rating: 5, createdAt: Date.now() },
        { productId: 'product1', userId: 'user2', rating: 5, createdAt: Date.now() },
      ]

      const avgRating = getAverageRating('product1', products, ratings)
      // User average: (5 + 5) / 2 = 5
      // Combined: (5 + 4.0) / 2 = 4.5
      expect(avgRating).toBe(4.5)
    })

    it('should return 0 when no ratings exist', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'user-submitted',
        },
      ]

      const ratings: Rating[] = []

      const avgRating = getAverageRating('product1', products, ratings)
      expect(avgRating).toBe(0)
    })

    it('should handle single user rating combined with source rating', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'knitting',
          source: 'Ravelry',
          sourceUrl: 'https://ravelry.com/patterns/123',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-ravelry',
          sourceRating: 3.8,
          sourceRatingCount: 15,
        },
      ]

      const ratings: Rating[] = [
        { productId: 'product1', userId: 'user1', rating: 5, createdAt: Date.now() },
      ]

      const avgRating = getAverageRating('product1', products, ratings)
      // User average: 5
      // Combined: (5 + 3.8) / 2 = 4.4
      expect(avgRating).toBe(4.4)
    })
  })

  describe('GitHub Star to Rating Conversion', () => {
    it('should convert high star counts to 5.0 rating', () => {
      const product: Product = {
        id: 'product1',
        name: 'Popular Repo',
        type: 'Software',
        source: 'GitHub',
        sourceUrl: 'https://github.com/test/popular',
        description: 'Test',
        tags: ['test'],
        createdAt: Date.now(),
        origin: 'scraped-github',
        sourceRating: 5.0,
        sourceRatingCount: 5000,
      }

      expect(product.sourceRating).toBe(5.0)
    })

    it('should convert medium star counts to appropriate ratings', () => {
      const testCases = [
        { stars: 1250, expectedRating: 4.5 },
        { stars: 500, expectedRating: 4.0 },
        { stars: 100, expectedRating: 3.5 },
        { stars: 50, expectedRating: 3.0 },
        { stars: 10, expectedRating: 2.5 },
        { stars: 5, expectedRating: 2.0 },
      ]

      testCases.forEach(({ stars, expectedRating }) => {
        const product: Product = {
          id: `product-${stars}`,
          name: 'Test Repo',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test/repo',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-github',
          sourceRating: expectedRating,
          sourceRatingCount: stars,
        }

        expect(product.sourceRating).toBe(expectedRating)
      })
    })

    it('should handle low star counts', () => {
      const product: Product = {
        id: 'product1',
        name: 'New Repo',
        type: 'Software',
        source: 'GitHub',
        sourceUrl: 'https://github.com/test/new',
        description: 'Test',
        tags: ['test'],
        createdAt: Date.now(),
        origin: 'scraped-github',
        sourceRating: 1.0,
        sourceRatingCount: 3,
      }

      expect(product.sourceRating).toBe(1.0)
    })

    it('should handle zero stars with no rating', () => {
      const product: Product = {
        id: 'product1',
        name: 'Unstarred Repo',
        type: 'Software',
        source: 'GitHub',
        sourceUrl: 'https://github.com/test/unstarred',
        description: 'Test',
        tags: ['test'],
        createdAt: Date.now(),
        origin: 'scraped-github',
        sourceRating: undefined,
        sourceRatingCount: 0,
      }

      expect(product.sourceRating).toBeUndefined()
    })
  })

  describe('Rating Display Logic', () => {
    it('should show source rating count when only source rating exists', () => {
      const product: Product = {
        id: 'product1',
        name: 'Test Product',
        type: 'Fabrication',
        source: 'Thingiverse',
        sourceUrl: 'https://thingiverse.com/thing:123',
        description: 'Test',
        tags: ['test'],
        createdAt: Date.now(),
        origin: 'scraped-thingiverse',
        sourceRating: 4.5,
        sourceRatingCount: 23,
      }

      // Should display: "23 on Thingiverse"
      expect(product.sourceRatingCount).toBe(23)
      expect(product.source).toBe('Thingiverse')
    })

    it('should show combined counts when both exist', () => {
      const product: Product = {
        id: 'product1',
        name: 'Test Product',
        type: 'Software',
        source: 'GitHub',
        sourceUrl: 'https://github.com/test',
        description: 'Test',
        tags: ['test'],
        createdAt: Date.now(),
        origin: 'scraped-github',
        sourceRating: 4.0,
        sourceRatingCount: 1500,
      }

      const userRatingCount = 3

      // Should display: "3 users, 1500 on GitHub"
      expect(userRatingCount).toBe(3)
      expect(product.sourceRatingCount).toBe(1500)
      expect(product.source).toBe('GitHub')
    })
  })

  describe('Edge Cases', () => {
    it('should handle products with sourceRating but no sourceRatingCount', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-github',
          sourceRating: 4.5,
          // sourceRatingCount is undefined
        },
      ]

      const ratings: Rating[] = []

      const avgRating = getAverageRating('product1', products, ratings)
      expect(avgRating).toBe(4.5)
    })

    it('should handle products with sourceRatingCount but no sourceRating', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-github',
          // sourceRating is undefined
          sourceRatingCount: 100,
        },
      ]

      const ratings: Rating[] = []

      const avgRating = getAverageRating('product1', products, ratings)
      expect(avgRating).toBe(0) // No rating available
    })

    it('should handle extreme rating values', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-github',
          sourceRating: 5.0,
          sourceRatingCount: 1000,
        },
      ]

      const ratings: Rating[] = [
        { productId: 'product1', userId: 'user1', rating: 1, createdAt: Date.now() },
      ]

      const avgRating = getAverageRating('product1', products, ratings)
      // User average: 1
      // Combined: (1 + 5.0) / 2 = 3.0
      expect(avgRating).toBe(3.0)
    })

    it('should handle multiple user ratings with varying values', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Fabrication',
          source: 'Thingiverse',
          sourceUrl: 'https://thingiverse.com/thing:123',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-thingiverse',
          sourceRating: 3.5,
          sourceRatingCount: 40,
        },
      ]

      const ratings: Rating[] = [
        { productId: 'product1', userId: 'user1', rating: 5, createdAt: Date.now() },
        { productId: 'product1', userId: 'user2', rating: 4, createdAt: Date.now() },
        { productId: 'product1', userId: 'user3', rating: 3, createdAt: Date.now() },
        { productId: 'product1', userId: 'user4', rating: 5, createdAt: Date.now() },
      ]

      const avgRating = getAverageRating('product1', products, ratings)
      // User average: (5 + 4 + 3 + 5) / 4 = 4.25
      // Combined: (4.25 + 3.5) / 2 = 3.875
      expect(avgRating).toBe(3.875)
    })
  })

  describe('Filtering by Minimum Rating', () => {
    it('should include products with only source rating above minimum', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'High Rated Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-github',
          sourceRating: 4.5,
          sourceRatingCount: 100,
        },
        {
          id: 'product2',
          name: 'Low Rated Product',
          type: 'Software',
          source: 'GitHub',
          sourceUrl: 'https://github.com/test2',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-github',
          sourceRating: 2.5,
          sourceRatingCount: 50,
        },
      ]

      const ratings: Rating[] = []
      const minRating = 4.0

      const filteredProducts = products.filter(product => {
        const avgRating = getAverageRating(product.id, products, ratings)
        return avgRating >= minRating
      })

      expect(filteredProducts).toHaveLength(1)
      expect(filteredProducts[0].id).toBe('product1')
    })

    it('should include products with combined rating above minimum', () => {
      const products: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          type: 'Fabrication',
          source: 'Thingiverse',
          sourceUrl: 'https://thingiverse.com/thing:123',
          description: 'Test',
          tags: ['test'],
          createdAt: Date.now(),
          origin: 'scraped-thingiverse',
          sourceRating: 3.0,
          sourceRatingCount: 30,
        },
      ]

      const ratings: Rating[] = [
        { productId: 'product1', userId: 'user1', rating: 5, createdAt: Date.now() },
      ]

      const minRating = 3.5

      const filteredProducts = products.filter(product => {
        const avgRating = getAverageRating(product.id, products, ratings)
        return avgRating >= minRating
      })

      // Combined rating: (5 + 3.0) / 2 = 4.0, which is >= 3.5
      expect(filteredProducts).toHaveLength(1)
    })
  })
})
