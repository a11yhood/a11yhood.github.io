import { afterEach, describe, expect, it, vi } from 'vitest'
import { APIService } from '@/lib/api'

const productResponse = {
  id: 'product-1',
  name: 'Sample Product',
  type: 'Software',
  source: 'user-submitted',
  description: 'Sample description',
  tags: [],
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('APIService product image payload normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps image.url payload when updating a product', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(productResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await APIService.updateProduct('product-1', {
      image: {
        url: 'https://example.com/new-image.png',
        alt: 'Updated external image',
      },
    } as any)

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(requestInit.body))

    expect(body.image).toEqual({
      url: 'https://example.com/new-image.png',
      alt: 'Updated external image',
    })
  })

  it('builds image.url payload from legacy imageUrl/imageAlt updates', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(productResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await APIService.updateProduct('product-1', {
      imageUrl: 'https://example.com/legacy-image.png',
      imageAlt: 'Legacy alt text',
    })

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(requestInit.body))

    expect(body.image).toEqual({
      url: 'https://example.com/legacy-image.png',
      alt: 'Legacy alt text',
    })
  })

  it('does not serialize relative non-API image paths as URL payloads', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(productResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await APIService.updateProduct('product-1', {
      imageUrl: '/images/local-path.png',
      imageAlt: 'Local path image',
    })

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(requestInit.body))

    expect(body.image).toBeUndefined()
  })

  it('keeps image.url payload when creating a product', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(productResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await APIService.createProduct({
      name: 'Create With URL Image',
      type: 'Software',
      source: 'user-submitted',
      description: 'Product with external URL image',
      image: {
        url: 'https://example.com/create-image.png',
        alt: 'Create external image',
      },
      tags: [],
    } as any)

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(requestInit.body))

    expect(body.image).toEqual({
      url: 'https://example.com/create-image.png',
      alt: 'Create external image',
    })
  })
})