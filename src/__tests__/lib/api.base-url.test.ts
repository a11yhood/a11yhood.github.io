import { describe, it, expect } from 'vitest'
import { getApiBaseUrl } from '@/lib/api'

describe('getApiBaseUrl', () => {
  it('returns configured base URL for http://localhost:8000 even when frontend is https://localhost:5173', () => {
    const result = getApiBaseUrl('http://localhost:8000', 'https://localhost:5173', 'https:')
    expect(result).toBe('http://localhost:8000')
  })

  it('returns configured base when https backend with https frontend', () => {
    const result = getApiBaseUrl('https://api.example.test', 'https://localhost:5173', 'https:')
    expect(result).toBe('https://api.example.test')
  })

  it('returns configured base when not on localhost:5173', () => {
    const result = getApiBaseUrl('http://localhost:8000', 'http://localhost:4173', 'http:')
    expect(result).toBe('http://localhost:8000')
  })

  it('uses actual environment values when no parameters provided', () => {
    // Just verify it doesn't throw - actual value depends on build-time env
    const result = getApiBaseUrl()
    expect(typeof result).toBe('string')
  })
})
