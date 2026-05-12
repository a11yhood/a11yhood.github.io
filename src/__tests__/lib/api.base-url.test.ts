import { describe, it, expect } from 'vitest'
import { getApiBaseUrl, resolveApiImageUrl } from '@/lib/api'

describe('getApiBaseUrl', () => {
  it('returns configured base URL for http://localhost:8002 even when frontend is https://localhost:5173', () => {
    const result = getApiBaseUrl('http://localhost:8002', 'https://localhost:5173', 'https:')
    expect(result).toBe('http://localhost:8002')
  })

  it('returns configured base when https backend with https frontend', () => {
    const result = getApiBaseUrl('https://api.example.test', 'https://localhost:5173', 'https:')
    expect(result).toBe('https://api.example.test')
  })

  it('returns configured base when not on localhost:5173', () => {
    const result = getApiBaseUrl('http://localhost:8002', 'http://localhost:4173', 'http:')
    expect(result).toBe('http://localhost:8002')
  })

  it('uses actual environment values when no parameters provided', () => {
    // Just verify it doesn't throw - actual value depends on build-time env
    const result = getApiBaseUrl()
    expect(typeof result).toBe('string')
  })
})

describe('resolveApiImageUrl', () => {
  it('prefixes relative API image URLs with configured backend base', () => {
    const result = resolveApiImageUrl('/api/images/abc-123', 'https://api.example.test', 'https://a11yhood.example', 'https:')
    expect(result).toBe('https://api.example.test/api/images/abc-123')
  })

  it('keeps relative image URLs when no backend base is configured', () => {
    const result = resolveApiImageUrl('/api/images/abc-123', '', 'https://a11yhood.example', 'https:')
    expect(result).toBe('/api/images/abc-123')
  })

  it('returns absolute URLs unchanged', () => {
    const result = resolveApiImageUrl('https://cdn.example.test/image.png', 'https://api.example.test', 'https://a11yhood.example', 'https:')
    expect(result).toBe('https://cdn.example.test/image.png')
  })
})
