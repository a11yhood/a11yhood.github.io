/**
 * Security tests for URL validation - verify backend rejects malicious URLs.
 * 
 * These tests verify that the backend (via Pydantic HttpUrl validation) properly
 * rejects dangerous URLs that could lead to XSS or SSRF attacks.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { runAllSeeds } from '../fixtures/test-seeds'

const API_BASE = 'http://localhost:8000/api'

const testUserId = DEV_USERS.user.id
const authToken = getDevToken(testUserId)

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken}`,
}

describe('Backend URL Validation Security', () => {
  beforeAll(async () => {
    await runAllSeeds()
  })

  describe('XSS Prevention - Dangerous Protocols', () => {
    it('should reject javascript: URLs in product source_url', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'XSS Test Product',
          description: 'Testing javascript: URL rejection',
          source_url: 'javascript:alert(1)',
          source: 'manual',
          type: 'Other',
        }),
      })

      // Should reject with validation error (422)
      expect(response.status).toBe(422)
    })

    it('should reject data: URLs in product source_url', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Data URL Test',
          description: 'Testing data: URL rejection',
          source_url: 'data:text/html,<script>alert(1)</script>',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(response.status).toBe(422)
    })

    it('should reject file: URLs in product source_url', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'File URL Test',
          description: 'Testing file: URL rejection',
          source_url: 'file:///etc/passwd',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(response.status).toBe(422)
    })
  })

  describe('Malformed URL Prevention', () => {
    it('should reject obviously invalid URLs', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Invalid URL Test',
          description: 'Testing invalid URL rejection',
          source_url: 'not-a-valid-url',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(response.status).toBe(422)
    })

    it('should reject empty URLs', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Empty URL Test',
          description: 'Testing empty URL rejection',
          source_url: '',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(response.status).toBe(422)
    })
  })

  describe('Valid URL Acceptance', () => {
    it('should accept valid https URLs', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Valid HTTPS Product',
          description: 'Testing valid https URL acceptance',
          source_url: 'https://github.com/user/repo',
          source: 'manual',
          type: 'Software',
        }),
      })

      expect(response.status).toBe(201)
    })

    it('should accept valid http URLs', async () => {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Valid HTTP Product',
          description: 'Testing valid http URL acceptance',
          source_url: 'http://example.com/product',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(response.status).toBe(201)
    })
  })

  describe('Product URL Additional Links', () => {
    it('should reject dangerous URLs in additional product URLs', async () => {
      // First create a product
      const createRes = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'URL Link Test Product',
          description: 'For testing additional URL validation',
          source_url: 'https://example.com/product',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(createRes.status).toBe(201)
      const product = await createRes.json()

      // Try to add a javascript: URL as an additional link
      const addUrlRes = await fetch(`${API_BASE}/products/${product.id}/urls`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          url: 'javascript:alert(1)',
          description: 'Malicious link',
        }),
      })

      expect(addUrlRes.status).toBe(422)
    })

    it('should accept valid URLs in additional product URLs', async () => {
      // First create a product
      const createRes = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'URL Link Valid Test',
          description: 'For testing valid additional URLs',
          source_url: 'https://example.com/product',
          source: 'manual',
          type: 'Other',
        }),
      })

      expect(createRes.status).toBe(201)
      const product = await createRes.json()

      // Add a valid URL (backend now properly checks ownership via product_editors table)
      const addUrlRes = await fetch(`${API_BASE}/products/${product.id}/urls`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          url: 'https://docs.example.com',
          description: 'Documentation',
        }),
      })

      expect(addUrlRes.status).toBe(201)
    })
  })
})
