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

  it('returns image reference when success response is JSON string id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify('123e4567-e89b-12d3-a456-426614174111'), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).resolves.toBe('/api/images/123e4567-e89b-12d3-a456-426614174111')
  })

  it.each([
    [{ image_id: '123e4567-e89b-12d3-a456-426614174222' }, '/api/images/123e4567-e89b-12d3-a456-426614174222'],
    [{ image_url: '/api/images/123e4567-e89b-12d3-a456-426614174333' }, '/api/images/123e4567-e89b-12d3-a456-426614174333'],
    [{ path: '/api/images/123e4567-e89b-12d3-a456-426614174444' }, '/api/images/123e4567-e89b-12d3-a456-426614174444'],
  ])('returns image reference when success response JSON contains a supported field: %j', async (payload, expected) => {
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

  it('returns trimmed image reference from successful text responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('  123e4567-e89b-12d3-a456-426614174555  ', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    )

    await expect(
      APIService.uploadImage(new File(['image-bytes'], 'image.png', { type: 'image/png' }))
    ).resolves.toBe('/api/images/123e4567-e89b-12d3-a456-426614174555')
  })

  it('sends crop fields in multipart form data when crop parameters are provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('123e4567-e89b-12d3-a456-426614174666', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    )

    await expect(
      APIService.uploadImage(
        new File(['image-bytes'], 'image.png', { type: 'image/png' }),
        { x: 1, y: 2, width: 3, height: 4 }
      )
    ).resolves.toBe('/api/images/123e4567-e89b-12d3-a456-426614174666')

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
