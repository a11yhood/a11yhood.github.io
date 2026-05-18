import { afterEach, describe, expect, it, vi } from 'vitest'
import { APIService } from '@/lib/api'

describe('APIService.uploadImage id normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns /api/images/:id when backend responds with uuid id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const file = new File(['abc'], 'test.png', { type: 'image/png' })
    const result = await APIService.uploadImage(file)

    expect(result).toBe('/api/images/123e4567-e89b-12d3-a456-426614174000')
  })

  it('returns /api/images/:id when backend responds with plain uuid body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('123e4567-e89b-12d3-a456-426614174001', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    )

    const file = new File(['abc'], 'test.png', { type: 'image/png' })
    const result = await APIService.uploadImage(file)

    expect(result).toBe('/api/images/123e4567-e89b-12d3-a456-426614174001')
  })

  it('returns /api/images/:id when backend responds with string id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '24680' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const file = new File(['abc'], 'test.png', { type: 'image/png' })
    const result = await APIService.uploadImage(file)

    expect(result).toBe('/api/images/24680')
  })
})
