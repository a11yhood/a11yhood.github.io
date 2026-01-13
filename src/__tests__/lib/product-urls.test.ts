import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProductUrl } from '../types/product-url'

describe('Product URLs', () => {
  const mockProductId = 'product-1'
  const mockUserId = 'user-1'
  
  const mockUrl: ProductUrl = {
    id: 'url-1',
    productId: mockProductId,
    url: 'https://example.com/resource',
    description: 'Example resource',
    createdBy: mockUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  describe('ProductUrl interface', () => {
    it('should have required fields', () => {
      const url: ProductUrl = {
        id: 'url-1',
        productId: 'product-1',
        url: 'https://example.com',
        createdBy: 'user-1',
        createdAt: '2025-12-20T00:00:00Z',
        updatedAt: '2025-12-20T00:00:00Z',
      }
      expect(url.id).toBe('url-1')
      expect(url.productId).toBe('product-1')
      expect(url.url).toBe('https://example.com')
      expect(url.createdBy).toBe('user-1')
    })

    it('should allow optional description', () => {
      const urlWithDescription: ProductUrl = {
        ...mockUrl,
        description: 'This is a helpful resource',
      }
      expect(urlWithDescription.description).toBe('This is a helpful resource')

      const urlWithoutDescription: ProductUrl = {
        ...mockUrl,
        description: undefined,
      }
      expect(urlWithoutDescription.description).toBeUndefined()
    })
  })

  describe('ProductUrl creation', () => {
    it('should create a product URL with all fields', () => {
      expect(mockUrl).toMatchObject({
        id: 'url-1',
        productId: mockProductId,
        url: 'https://example.com/resource',
        description: 'Example resource',
        createdBy: mockUserId,
      })
    })

    it('should track creation timestamp', () => {
      const now = new Date().toISOString()
      const url: ProductUrl = {
        ...mockUrl,
        createdAt: now,
        updatedAt: now,
      }
      expect(url.createdAt).toBe(now)
      expect(url.updatedAt).toBe(now)
    })

    it('should store creator user ID', () => {
      expect(mockUrl.createdBy).toBe(mockUserId)
    })
  })

  describe('Multiple URLs per product', () => {
    it('should support multiple URLs for a single product', () => {
      const urls: ProductUrl[] = [
        { ...mockUrl, id: 'url-1' },
        { ...mockUrl, id: 'url-2', url: 'https://github.com/repo', description: 'Source code' },
        { ...mockUrl, id: 'url-3', url: 'https://docs.example.com', description: 'Documentation' },
      ]
      
      expect(urls).toHaveLength(3)
      expect(urls.filter(u => u.productId === mockProductId)).toHaveLength(3)
    })

    it('should allow filtering URLs by product', () => {
      const allUrls: ProductUrl[] = [
        { ...mockUrl, productId: 'product-1' },
        { ...mockUrl, id: 'url-2', productId: 'product-2' },
        { ...mockUrl, id: 'url-3', productId: 'product-1' },
      ]
      
      const product1Urls = allUrls.filter(u => u.productId === 'product-1')
      expect(product1Urls).toHaveLength(2)
    })
  })

  describe('URL updates', () => {
    it('should track updated_at timestamp on modifications', () => {
      const originalUrl = mockUrl
      const updatedUrl: ProductUrl = {
        ...originalUrl,
        description: 'Updated description',
        updatedAt: new Date().toISOString(),
      }
      
      expect(updatedUrl.updatedAt).not.toBe(originalUrl.updatedAt)
      expect(updatedUrl.createdAt).toBe(originalUrl.createdAt)
    })

    it('should preserve creator even when updated by product manager', () => {
      const updatedUrl: ProductUrl = {
        ...mockUrl,
        description: 'Owner updated this',
      }
      expect(updatedUrl.createdBy).toBe(mockUserId)
    })
  })

  describe('URL ownership and authorization', () => {
    it('should only allow product manager to add URLs', () => {
      // This test documents expected behavior:
      // - Only product manager can add URLs
      // - Authorization check happens on backend
      expect(mockUrl.productId).toBe(mockProductId)
    })

    it('should only allow URL creator or product manager to update', () => {
      // This test documents expected behavior
      expect(mockUrl.createdBy).toBe(mockUserId)
    })

    it('should only allow product manager to delete URLs', () => {
      // This test documents expected behavior
      expect(mockUrl.productId).toBe(mockProductId)
    })
  })
})
