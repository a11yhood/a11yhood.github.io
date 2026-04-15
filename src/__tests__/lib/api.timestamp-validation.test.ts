import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIError, APIService } from '@/lib/api'

describe('API timestamp validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    APIService.setAuthTokenGetter(async () => null)
  })

  it('rejects legacy numeric activity timestamps before sending the request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await expect(APIService.logUserActivity({
      userId: 'user-1',
      type: 'rating',
      productId: 'product-1',
      timestamp: 1713182400000 as unknown as string,
    })).rejects.toMatchObject({
      name: 'APIError',
      status: 400,
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects legacy numeric blog timestamps before sending the request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await expect(APIService.createBlogPost({
      title: 'Test post',
      slug: 'test-post',
      content: 'content',
      excerpt: 'excerpt',
      authorId: 'author-1',
      authorName: 'Author',
      published: true,
      publishedAt: 1713182400000 as unknown as string,
    })).rejects.toMatchObject({
      name: 'APIError',
      status: 400,
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects legacy numeric timestamps returned from activities', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([
        {
          user_id: 'user-1',
          type: 'rating',
          product_id: 'product-1',
          timestamp: 1713182400000,
        },
      ]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(APIService.getUserActivities('user-1')).rejects.toBeInstanceOf(APIError)
  })

  it('rejects legacy numeric timestamps returned from blog posts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([
        {
          id: 'post-1',
          title: 'Test post',
          slug: 'test-post',
          content: 'content',
          excerpt: 'excerpt',
          author_id: 'author-1',
          author_name: 'Author',
          created_at: 1713182400000,
          updated_at: '2026-04-15T12:30:00.000Z',
          publish_date: '2026-04-15T13:00:00.000Z',
          published: true,
          published_at: '2026-04-15T13:00:00.000Z',
        },
      ]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(APIService.getAllBlogPosts(false)).rejects.toBeInstanceOf(APIError)
  })
})