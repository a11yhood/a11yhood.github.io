import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link as LinkIcon, Trash } from '@phosphor-icons/react'
import { useNotifications } from '@/contexts/NotificationContext'
import { logger } from '@/lib/logger'

type ProductImageManagerProps = {
  imageUrl?: string
  imageAlt?: string
  onImageChange: (imageUrl: string | undefined | null, imageAlt: string | undefined | null) => void
  disabled?: boolean
  imageAltError?: string
}

export type ProductImageManagerRef = {
  getPendingImageData: () => { url: string; alt: string } | null
  submitPendingImage: () => boolean
}

/**
 * Convert a GitHub blob URL to a raw content URL so it can be used as an image src.
 * e.g. https://github.com/owner/repo/blob/sha/path/img.png
 *   -> https://raw.githubusercontent.com/owner/repo/sha/path/img.png
 * Returns the original URL unchanged if it is not a recognised GitHub blob URL.
 */
export function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'github.com') {
      const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/)
      if (match) {
        // Preserve the entire ref/path segment (which may contain slashes) when converting
        return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`
      }
    }
    return url
  } catch {
    return url
  }
}

export const ProductImageManager = forwardRef<ProductImageManagerRef, ProductImageManagerProps>((
  {
    imageUrl,
    imageAlt,
    onImageChange,
    disabled = false,
    imageAltError,
  },
  ref
) => {
  const [urlInput, setUrlInput] = useState(imageUrl || '')
  const [altText, setAltText] = useState(imageAlt || '')
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(imageUrl)
  const { notify } = useNotifications()

  // Sync internal state when props change (e.g., when dialog opens with existing product data)
  useEffect(() => {
    logger.debug('[ProductImageManager] Props changed:', { imageUrl, imageAlt })
    setUrlInput(imageUrl || '')
    setAltText(imageAlt || '')
    setPreviewUrl(imageUrl)
  }, [imageUrl, imageAlt])

  const handleUrlSubmit = useCallback(() => {
    const trimmedUrl = urlInput.trim()
    if (!trimmedUrl) {
      notify.error('Please enter an image URL')
      return
    }

    try {
      new URL(trimmedUrl)
      const normalizedUrl = normalizeImageUrl(trimmedUrl)
      if (normalizedUrl !== trimmedUrl) {
        notify.info('GitHub image URL converted to a direct image link')
      }
      setUrlInput(normalizedUrl)
      setPreviewUrl(normalizedUrl)
      logger.debug('[ProductImageManager.handleUrlSubmit] Calling onImageChange:', { normalizedUrl, altText })
      onImageChange(normalizedUrl, altText)
      notify.success('Image URL added successfully')
    } catch {
      notify.error('Please enter a valid URL')
    }
  }, [urlInput, altText, onImageChange])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getPendingImageData: () => {
      // Return pending URL data even if alt text is empty so the dialog's
      // validation can catch the missing alt and show the appropriate error.
      const trimmedUrl = urlInput.trim()
      if (!previewUrl && trimmedUrl) {
        try {
          // Validate and normalize the URL before returning
          new URL(trimmedUrl)
          const normalizedUrl = normalizeImageUrl(trimmedUrl)
          return { url: normalizedUrl, alt: altText.trim() }
        } catch {
          // Invalid URL, return null
          return null
        }
      }
      return null
    },
    submitPendingImage: () => {
      if (!previewUrl && urlInput.trim()) {
        handleUrlSubmit()
        return true
      }
      return false
    }
  }), [previewUrl, urlInput, altText, handleUrlSubmit])

  const handleAltTextChange = (value: string) => {
    setAltText(value)
    if (previewUrl) {
      logger.debug('[ProductImageManager.handleAltTextChange] Calling onImageChange:', { previewUrl, altText: value })
      onImageChange(previewUrl, value)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(undefined)
    setUrlInput('')
    setAltText('')
    logger.debug('[ProductImageManager.handleRemoveImage] Calling onImageChange with null to clear fields')
    // Send null (not undefined) to explicitly clear the image fields
    onImageChange(null, null)
    notify.success('Image removed')
  }

  const handleEditImage = () => {
    logger.debug('[ProductImageManager.handleEditImage] Editing image - populating fields with current values')
    // Pre-populate the URL input field with current value
    // (altText already has the current value in state)
    setUrlInput(previewUrl || '')
    // Clear preview to show input mode
    setPreviewUrl(undefined)
  }

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="space-y-4">
          <div className="relative">
            <div 
              className="w-full aspect-video max-w-md bg-muted rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleEditImage}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleEditImage()
                }
              }}
              aria-label="Click to edit image URL and alt text"
            >
              <img
                src={previewUrl}
                alt={altText || 'Product preview'}
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2"
              disabled={disabled}
            >
              <Trash size={16} className="mr-1" />
              Remove
            </Button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
              Alt Text <span className="text-destructive">*</span>
              <Input
                id="image-alt-text"
                name="imageAlt"
                autoComplete="off"
                value={altText}
                onChange={(e) => handleAltTextChange(e.target.value)}
                placeholder="Describe the image for accessibility (minimum 10 characters)"
                disabled={disabled}
                aria-invalid={!!imageAltError}
                aria-describedby={`image-alt-help${imageAltError ? ' image-alt-error' : ''}`}
                className="mt-1"
              />
            </label>
            <p id="image-alt-help" className="text-xs text-muted-foreground">
              Provide a clear description of the image for users who cannot see it.
            </p>
            {imageAltError && (
              <p id="image-alt-error" className="text-sm text-destructive" role="alert">{imageAltError}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
              Image URL
              <div className="flex gap-2 mt-1">
                <Input
                  id="image-url-input"
                  name="imageUrl"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  disabled={disabled}
                  aria-describedby="image-url-help"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleUrlSubmit()
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleUrlSubmit}
                  disabled={disabled || !urlInput.trim()}
                >
                  <LinkIcon size={16} className="mr-2" />
                  Add URL
                </Button>
              </div>
            </label>
            <p className="text-xs text-muted-foreground" id="image-url-help">
              Provide a direct link to an image hosted online. GitHub image links are converted automatically.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
              Alt Text {urlInput.trim() && <span className="text-destructive">*</span>}
              <Input
                id="image-alt-text"
                name="imageAlt"
                autoComplete="off"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility (minimum 10 characters)"
                disabled={disabled}
                aria-invalid={!!imageAltError}
                aria-describedby={`image-alt-help${imageAltError ? ' image-alt-error' : ''}`}
                className="mt-1"
              />
            </label>
            <p id="image-alt-help" className="text-xs text-muted-foreground">
              Provide a clear description of the image for users who cannot see it.
            </p>
            {imageAltError && (
              <p id="image-alt-error" className="text-sm text-destructive" role="alert">{imageAltError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
})
