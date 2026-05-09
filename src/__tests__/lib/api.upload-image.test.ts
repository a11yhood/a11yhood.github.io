import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIError, APIService } from '@/lib/api'

describe('APIService.uploadImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    APIService.setAuthTokenGetter(async () => null)
  })

  it('throws APIError with JSON error details for non-OK responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Crop area is invalid' }), {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).rejects.toMatchObject({
      name: 'APIError',
      status: 422,
      message: 'Crop area is invalid',
      data: { detail: 'Crop area is invalid' },
    })
  })

  it('throws APIError with text body for non-OK non-JSON responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Upload failed', {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'content-type': 'text/plain' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).rejects.toMatchObject({
      name: 'APIError',
      status: 400,
      message: 'Upload failed',
      data: { message: 'Upload failed' },
    })
  })

  it('returns URL when success response is JSON string', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify('https://example.com/uploaded.png'), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).resolves.toBe('https://example.com/uploaded.png')
  })

  it.each([
    [{ imageUrl: 'https://example.com/image-url.png' }, 'https://example.com/image-url.png'],
    [{ url: 'https://example.com/url.png' }, 'https://example.com/url.png'],
    [{ dataUrl: 'data:image/png;base64,abc123' }, 'data:image/png;base64,abc123'],
  ])('returns URL when success response JSON contains a supported field: %j', async (payload, expected) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).resolves.toBe(expected)
  })

  it('returns trimmed URL from successful text responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('  https://example.com/uploaded-text.png  ', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).resolves.toBe('https://example.com/uploaded-text.png')
  })

  it('sends crop fields in multipart form data when crop parameters are provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('https://example.com/cropped.png', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    )

    await expect(
      APIService.uploadImage(
        new File(['image-bytes'], 'image.png', { type: 'image/png' }),
        { x: 1, y: 2, width: 3, height: 4 }
      )
    ).resolves.toBe('https://example.com/cropped.png')

    const [, requestInit] = fetchSpy.mock.calls[0] ?? []
    const formData = requestInit?.body as FormData

    expect(formData.get('crop_x')).toBe('1')
    expect(formData.get('crop_y')).toBe('2')
    expect(formData.get('crop_width')).toBe('3')
    expect(formData.get('crop_height')).toBe('4')
  })

  it('throws APIError for successful JSON responses with unexpected payload shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).rejects.toBeInstanceOf(APIError)
  })
})
