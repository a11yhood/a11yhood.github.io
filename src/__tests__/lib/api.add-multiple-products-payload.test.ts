import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIService } from '@/lib/api'

describe('APIService addMultipleProductsToCollection payload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends ProductIdsRequest shape with product_ids', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'collection-1',
          slug: 'bulk-add-contract-test',
          name: 'Bulk Add Contract Test',
          user_id: 'user-1',
          user_name: 'dev_admin',
          entries: [],
          product_slugs: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          is_public: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await APIService.addMultipleProductsToCollection('bulk-add-contract-test', [
      'product-slug-1',
      'product-slug-2',
    ])

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const requestInit = fetchSpy.mock.calls[0][1]
    expect(requestInit?.method).toBe('POST')

    const body = JSON.parse(String(requestInit?.body))
    expect(body).toEqual({
      product_ids: ['product-slug-1', 'product-slug-2'],
    })
    expect(body.product_slugs).toBeUndefined()
  })
})
