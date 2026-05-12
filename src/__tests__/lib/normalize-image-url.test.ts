import { describe, it, expect } from 'vitest'
import { calculateCropRect, getCropPreviewSize, normalizeImageUrl } from '@/components/ProductImageManager'

describe('normalizeImageUrl', () => {
  it('converts a GitHub blob URL to a raw.githubusercontent.com URL', () => {
    const blobUrl =
      'https://github.com/accessible-eyedrop/accessible-eyedrop-hardware/blob/a432c51a89cc8b32de601e8e8a4d6d6cd212ce8b/img/linda.png'
    expect(normalizeImageUrl(blobUrl)).toBe(
      'https://raw.githubusercontent.com/accessible-eyedrop/accessible-eyedrop-hardware/a432c51a89cc8b32de601e8e8a4d6d6cd212ce8b/img/linda.png'
    )
  })

  it('converts a GitHub blob URL with a branch name', () => {
    const blobUrl = 'https://github.com/owner/repo/blob/main/assets/photo.jpg'
    expect(normalizeImageUrl(blobUrl)).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/assets/photo.jpg'
    )
  })

  it('converts a GitHub blob URL with a slashed branch name (e.g. feature/foo)', () => {
    const blobUrl = 'https://github.com/owner/repo/blob/feature/my-branch/assets/photo.jpg'
    expect(normalizeImageUrl(blobUrl)).toBe(
      'https://raw.githubusercontent.com/owner/repo/feature/my-branch/assets/photo.jpg'
    )
  })

  it('converts a GitHub blob URL with a nested path', () => {
    const blobUrl = 'https://github.com/owner/repo/blob/main/deep/nested/dir/image.png'
    expect(normalizeImageUrl(blobUrl)).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/deep/nested/dir/image.png'
    )
  })

  it('leaves raw.githubusercontent.com URLs unchanged', () => {
    const rawUrl =
      'https://raw.githubusercontent.com/owner/repo/main/img/photo.png'
    expect(normalizeImageUrl(rawUrl)).toBe(rawUrl)
  })

  it('leaves non-GitHub URLs unchanged', () => {
    const url = 'https://example.com/image.jpg'
    expect(normalizeImageUrl(url)).toBe(url)
  })

  it('leaves a GitHub URL that is not a blob URL unchanged', () => {
    const url = 'https://github.com/owner/repo'
    expect(normalizeImageUrl(url)).toBe(url)
  })

  it('returns the original string if the URL is invalid', () => {
    const notAUrl = 'not-a-url'
    expect(normalizeImageUrl(notAUrl)).toBe(notAUrl)
  })

  it('normalizes a GitHub blob URL that has leading/trailing whitespace when pre-trimmed', () => {
    // normalizeImageUrl itself receives the already-trimmed value from handleUrlSubmit
    const blobUrl = 'https://github.com/owner/repo/blob/main/img/photo.png'
    expect(normalizeImageUrl(blobUrl)).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/img/photo.png'
    )
  })
})

describe('calculateCropRect', () => {
  it('calculates horizontal crop offsets for wider-than-16:9 images at x boundaries', () => {
    expect(calculateCropRect(2000, 1000, 0, 50)).toEqual({ x: 0, y: 0, width: 1778, height: 1000 })
    expect(calculateCropRect(2000, 1000, 50, 50)).toEqual({ x: 111, y: 0, width: 1778, height: 1000 })
    expect(calculateCropRect(2000, 1000, 100, 50)).toEqual({ x: 222, y: 0, width: 1778, height: 1000 })
  })

  it('calculates vertical crop offsets for taller-than-16:9 images at y boundaries', () => {
    expect(calculateCropRect(1000, 2000, 50, 0)).toEqual({ x: 0, y: 0, width: 1000, height: 563 })
    expect(calculateCropRect(1000, 2000, 50, 50)).toEqual({ x: 0, y: 719, width: 1000, height: 563 })
    expect(calculateCropRect(1000, 2000, 50, 100)).toEqual({ x: 0, y: 1437, width: 1000, height: 563 })
  })

  it('returns full image bounds for exact 16:9 images regardless of slider positions', () => {
    expect(calculateCropRect(1600, 900, 0, 0)).toEqual({ x: 0, y: 0, width: 1600, height: 900 })
    expect(calculateCropRect(1600, 900, 50, 50)).toEqual({ x: 0, y: 0, width: 1600, height: 900 })
    expect(calculateCropRect(1600, 900, 100, 100)).toEqual({ x: 0, y: 0, width: 1600, height: 900 })
  })
})

describe('getCropPreviewSize', () => {
  it('scales down large images to fit crop preview bounds', () => {
    expect(getCropPreviewSize(2000, 1000)).toEqual({ width: 640, height: 320 })
  })

  it('does not upscale small images', () => {
    expect(getCropPreviewSize(320, 180)).toEqual({ width: 320, height: 180 })
  })
})
