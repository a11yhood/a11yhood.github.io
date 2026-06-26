import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIService } from '@/lib/api'

describe('APIService createCollection payload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends flat entry id fields required by CollectionCreate schema', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'collection-1',
          slug: 'payload-contract-test',
          name: 'Payload Contract Test',
          description: 'contract',
          user_id: 'user-1',
          user_name: 'dev_admin',
          is_public: false,
          entries: [],
          product_slugs: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await APIService.createCollection({
      name: 'Payload Contract Test',
      description: 'contract',
      username: 'test-user',
      isPublic: false,
      entries: [
        {
          kind: 'product',
          targetId: 'product-1',
          order: 0,
        },
        {
          kind: 'collection',
          targetId: 'collection-2',
          order: 1,
        },
      ],
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const requestInit = fetchSpy.mock.calls[0][1]
    expect(requestInit).toBeDefined()
    expect(requestInit?.method).toBe('POST')

    const body = JSON.parse(String(requestInit?.body))
    expect(body).toMatchObject({
      name: 'Payload Contract Test',
      description: 'contract',
      is_public: false,
      entries: [
        {
          kind: 'product',
          product_id: 'product-1',
        },
        {
          kind: 'collection',
          collection_id: 'collection-2',
        },
      ],
    })

    expect(body.entries[0].product).toBeUndefined()
    expect(body.entries[1].collection).toBeUndefined()
  })
})
