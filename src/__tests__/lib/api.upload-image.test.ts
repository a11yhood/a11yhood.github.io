import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIError, APIService } from '@/lib/api'

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

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
    const body = requestInit?.body
    expect(isFormDataBody(body)).toBe(true)
    const formBody = body as FormData
    expect(formBody.get('crop_x')).toBe('1')
    expect(formBody.get('crop_y')).toBe('2')
    expect(formBody.get('crop_width')).toBe('3')
    expect(formBody.get('crop_height')).toBe('4')
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

  it('strips CR/LF and control characters from fileName to prevent header injection', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('safe-id', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    )

    // Filename containing CR, LF and other control chars that would break multipart headers.
    const injectedName = 'evil\r\nX-Injected: header\r\n.png'
    await APIService.uploadImage(new File(['bytes'], injectedName, { type: 'image/png' }))

    const [, requestInit] = fetchSpy.mock.calls[0] ?? []
    const body = requestInit?.body
    expect(isFormDataBody(body)).toBe(true)
    const formBody = body as FormData
    const uploaded = formBody.get('file')
    expect(uploaded).toBeTruthy()
    expect(uploaded instanceof File).toBe(true)
    const uploadedFile = uploaded as File
    expect(uploadedFile.name).not.toContain('\r')
    expect(uploadedFile.name).not.toContain('\n')
    expect(uploadedFile.name).toContain('evil')
  })

  it('strips CR/LF and control characters from fileType to prevent header injection', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('safe-id', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    )

    const injectedType = 'image/png\r\nX-Injected: header'
    // Both File and Blob constructors normalize the type per spec (strips chars outside
    // U+0020–U+007E). The real attack surface is a duck-typed object whose .type has not
    // been normalized — e.g. a custom Blob-like coming from an untrusted source.
    const blobLike = {
      type: injectedType,
      size: 5,
      arrayBuffer: () => Promise.resolve(new TextEncoder().encode('bytes').buffer as ArrayBuffer),
    } as unknown as Blob
    await APIService.uploadImage(blobLike)

    const [, requestInit] = fetchSpy.mock.calls[0] ?? []
    const body = requestInit?.body
    expect(isFormDataBody(body)).toBe(true)
    const formBody = body as FormData
    const uploaded = formBody.get('file')
    expect(uploaded).toBeTruthy()
    expect(uploaded instanceof File || uploaded instanceof Blob).toBe(true)
    const uploadedBlob = uploaded as Blob
    expect(uploadedBlob.type).not.toContain('\r')
    expect(uploadedBlob.type).not.toContain('\n')
    expect(uploadedBlob.type).toContain('image/png')
  })
})
