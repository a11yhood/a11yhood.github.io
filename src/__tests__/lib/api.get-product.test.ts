import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIService } from '@/lib/api'

describe('APIService.getProduct', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses ID endpoint directly for UUID product IDs', async () => {
    const productId = 'b5a1cc2b-a50c-4017-b215-b2921a030ef1'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: productId,
          name: 'Assistive Widget',
          type: 'Software',
          source: 'Github',
          description: 'A product',
          tags: [],
          created_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await APIService.getProduct(productId)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain(`/api/products/${productId}`)
  })

  it('keeps slug-first fallback behavior for non-UUID identifiers', async () => {
    const slugLikeId = 'assistive-widget'
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: '123',
            slug: slugLikeId,
            name: 'Assistive Widget',
            type: 'Software',
            source: 'Github',
            description: 'A product',
            tags: [],
            created_at: '2026-01-01T00:00:00Z',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )

    await APIService.getProduct(slugLikeId)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(String(fetchSpy.mock.calls[0][0])).toContain(`/api/products/slug/${slugLikeId}`)
    expect(String(fetchSpy.mock.calls[1][0])).toContain(`/api/products/${slugLikeId}`)
  })
})
