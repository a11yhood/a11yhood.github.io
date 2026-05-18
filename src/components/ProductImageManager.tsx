import { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Link as LinkIcon, Trash } from '@phosphor-icons/react'
import { useNotifications } from '@/contexts/NotificationContext'
import { APIService } from '@/lib/api'
import { logger } from '@/lib/logger'

type ProductImageManagerProps = {
  imageUrl?: string
  imageAlt?: string
  onImageChange: (imageUrl: string | undefined | null, imageAlt: string | undefined | null) => void
  disabled?: boolean
  imageAltError?: string
  canUploadFile?: boolean
}

export type ProductImageManagerRef = {
  getPendingImageData: () => { url: string; alt: string } | null
  submitPendingImage: () => boolean
  /** Returns the current alt text without triggering a state update. Use on submit to capture uncommitted keystrokes. */
  getCommittedAltText: () => string | null
  /** Indicates whether upload/crop work is still in-flight. */
  isProcessingImage: () => boolean
}

/**
 * Convert a GitHub blob URL to a raw content URL so it can be used as an image src.
 * e.g. https://github.com/owner/repo/blob/sha/path/img.png
 *   -> https://raw.githubusercontent.com/owner/repo/sha/path/img.png
 * Returns the original URL unchanged if it is not a recognised GitHub blob URL.
 */
// eslint-disable-next-line react-refresh/only-export-components
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

const PRODUCT_IMAGE_ASPECT_RATIO = 16 / 9
const MAX_CROP_PREVIEW_WIDTH = 640
const MAX_CROP_PREVIEW_HEIGHT = 360

type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

// eslint-disable-next-line react-refresh/only-export-components
export function calculateCropRect(imageWidth: number, imageHeight: number, xPercent: number, yPercent: number): CropRect {
  const imageAspectRatio = imageWidth / imageHeight

  if (imageAspectRatio > PRODUCT_IMAGE_ASPECT_RATIO) {
    const cropHeight = imageHeight
    const cropWidth = Math.round(cropHeight * PRODUCT_IMAGE_ASPECT_RATIO)
    const maxX = imageWidth - cropWidth
    return {
      x: Math.round((xPercent / 100) * maxX),
      y: 0,
      width: cropWidth,
      height: cropHeight,
    }
  }

  if (imageAspectRatio < PRODUCT_IMAGE_ASPECT_RATIO) {
    const cropWidth = imageWidth
    const cropHeight = Math.round(cropWidth / PRODUCT_IMAGE_ASPECT_RATIO)
    const maxY = imageHeight - cropHeight
    return {
      x: 0,
      y: Math.round((yPercent / 100) * maxY),
      width: cropWidth,
      height: cropHeight,
    }
  }

  return {
    x: 0,
    y: 0,
    width: imageWidth,
    height: imageHeight,
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function getCropPreviewSize(imageWidth: number, imageHeight: number) {
  const scale = Math.min(
    MAX_CROP_PREVIEW_WIDTH / imageWidth,
    MAX_CROP_PREVIEW_HEIGHT / imageHeight,
    1
  )

  return {
    width: Math.round(imageWidth * scale),
    height: Math.round(imageHeight * scale),
  }
}

function loadImageDimensions(sourceUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('Failed to load image dimensions'))
    image.src = sourceUrl
  })
}

function getFileExtensionFromType(mimeType: string) {
  const subtype = mimeType.split('/')[1] || 'png'
  return subtype.includes('svg') ? 'svg' : subtype.replace('jpeg', 'jpg')
}

function isSupportedCropMimeType(mimeType: string) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
}

function parseImageIdFromUrl(referenceUrl: string) {
  try {
    const parsed = new URL(
      referenceUrl,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    )
    const match = parsed.pathname.match(/\/api\/images\/([^/?#]+)/)
    return match?.[1]
  } catch {
    return undefined
  }
}

function getImageReferenceSummary(referenceUrl: string, imageId?: string) {
  if (imageId) {
    return `Image ID: ${decodeURIComponent(imageId)}`
  }

  if (referenceUrl.startsWith('data:image/')) {
    return 'Image source: Uploaded file preview'
  }

  if (referenceUrl.startsWith('blob:')) {
    return 'Image source: Local preview'
  }

  return `Image URL: ${referenceUrl}`
}

function isEditableImageReference(url: string | undefined) {
  if (!url) {
    return false
  }

  if (url.startsWith('/api/images/')) {
    return true
  }

  return url.startsWith('http://') || url.startsWith('https://')
}

function toEditableInputUrl(referenceUrl: string | undefined) {
  if (!referenceUrl || !isEditableImageReference(referenceUrl)) {
    return ''
  }

  if (referenceUrl.startsWith('/api/images/') && typeof window !== 'undefined') {
    return `${window.location.origin}${referenceUrl}`
  }

  return referenceUrl
}

async function sourceUrlToFile(sourceUrl: string): Promise<File> {
  try {
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(`Failed to load image (${response.status})`)
    }

    const blob = await response.blob()
    const mimeType = blob.type || 'image/png'

    if (!isSupportedCropMimeType(mimeType)) {
      throw new Error('Image cropping only supports JPEG, PNG, and WebP images. Please use a raster image instead of SVG.')
    }

    return new File([blob], `product-image.${getFileExtensionFromType(mimeType)}`, { type: mimeType })
  } catch (error) {
    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      throw new Error('Failed to load image for cropping. Remote images must allow cross-origin access.')
    }

    throw error instanceof Error ? error : new Error('Failed to prepare image for cropping')
  }
}

export const ProductImageManager = forwardRef<ProductImageManagerRef, ProductImageManagerProps>((
  {
    imageUrl,
    imageAlt,
    onImageChange,
    disabled = false,
    imageAltError,
    canUploadFile = true,
  },
  ref
) => {
  const [urlInput, setUrlInput] = useState(imageUrl || '')
  const [altText, setAltText] = useState(imageAlt || '')
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(imageUrl)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | undefined>(imageUrl)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropSourceDimensions, setCropSourceDimensions] = useState<{ width: number; height: number } | null>(null)
  const [cropXPercent, setCropXPercent] = useState(50)
  const [cropYPercent, setCropYPercent] = useState(50)
  const [isApplyingCrop, setIsApplyingCrop] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const { notify } = useNotifications()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropPreviewRef = useRef<HTMLDivElement>(null)
  const activeCropPointerIdRef = useRef<number | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = e.target.files?.[0]
    if (!file) {
      logger.debug('[ProductImageManager.handleFileUpload] No file selected (file picker canceled)')
      return
    }
    logger.debug('[ProductImageManager.handleFileUpload] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
    })
    if (!file.type.startsWith('image/')) {
      notify.error('Please select an image file')
      input.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error('Image must be less than 5MB')
      input.value = ''
      return
    }

    setIsUploadingImage(true)
    try {
      const uploadedImageReference = await APIService.uploadImage(file)
      logger.debug('[ProductImageManager.handleFileUpload] Upload complete:', { uploadedImageReference })
      const editableInputUrl = toEditableInputUrl(uploadedImageReference)
      setUrlInput(editableInputUrl)
      setPreviewUrl(uploadedImageReference)
      setCropSourceUrl(uploadedImageReference)
      setCropSourceDimensions(null)
      onImageChange(uploadedImageReference, altText)
      notify.success('Image uploaded')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploadingImage(false)
      // Reset the input so the same file can be re-selected if needed
      input.value = ''
    }
  }

  // Keep image source state in sync when parent-provided image URL changes.
  // This should not run on every alt text keystroke, or edit mode gets interrupted.
  useEffect(() => {
    logger.debug('[ProductImageManager] Image URL prop changed:', { imageUrl })
    setUrlInput(imageUrl || '')
    setPreviewUrl(imageUrl)
    setCropSourceUrl(imageUrl)
    setCropSourceDimensions(null)
  }, [imageUrl])

  // Keep alt text in sync from parent updates without forcing preview/edit mode transitions.
  useEffect(() => {
    logger.debug('[ProductImageManager] Image alt prop changed:', { imageAlt })
    setAltText(imageAlt || '')
  }, [imageAlt])

  useEffect(() => {
    if (!cropDialogOpen || !cropSourceUrl) {
      return
    }

    let cancelled = false
    setCropSourceDimensions(null)

    loadImageDimensions(cropSourceUrl)
      .then((dimensions) => {
        if (!cancelled) {
          setCropSourceDimensions(dimensions)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify.error(error instanceof Error ? error.message : 'Failed to load image for cropping')
          setCropDialogOpen(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cropDialogOpen, cropSourceUrl, notify])

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
      setCropSourceUrl(normalizedUrl)
      setCropSourceDimensions(null)
      logger.debug('[ProductImageManager.handleUrlSubmit] Calling onImageChange:', { normalizedUrl, altText })
      onImageChange(normalizedUrl, altText)
      notify.success('Image URL added successfully')
    } catch {
      notify.error('Please enter a valid URL')
    }
  }, [urlInput, altText, onImageChange, notify])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getPendingImageData: () => {
      // Always return the manager's current image state first. This prevents
      // submit-time races where parent form state is stale immediately after
      // selecting/uploading an image.
      const currentImageUrl = previewUrl ?? cropSourceUrl
      if (currentImageUrl) {
        return { url: currentImageUrl, alt: altText.trim() }
      }

      // Return pending URL input even if alt text is empty so the dialog's
      // validation can catch missing alt text rather than dropping the URL.
      const trimmedUrl = urlInput.trim()
      if (trimmedUrl) {
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
    },
    getCommittedAltText: () => {
      // Return the current alt text when an image is present, so submit handlers
      // can read uncommitted keystrokes without waiting for a state update.
      const currentImageUrl = previewUrl ?? cropSourceUrl
      return currentImageUrl ? altText : null
    },
    isProcessingImage: () => isUploadingImage || isApplyingCrop,
  }), [previewUrl, cropSourceUrl, urlInput, altText, handleUrlSubmit, isUploadingImage, isApplyingCrop])

  const handleAltTextChange = (value: string) => {
    setAltText(value)
  }

  const commitAltTextToParent = useCallback(() => {
    // Keep parent state in sync even when preview is temporarily hidden during edit mode.
    // Commit alt text on blur/save to avoid per-keystroke state churn.
    // `cropSourceUrl` tracks the most recently confirmed image source (original or cropped)
    // in both preview and edit states.
    const currentImageUrl = previewUrl ?? cropSourceUrl
    if (currentImageUrl) {
      logger.debug('[ProductImageManager.commitAltTextToParent] Calling onImageChange:', { currentImageUrl, altText })
      onImageChange(currentImageUrl, altText)
    }
  }, [previewUrl, cropSourceUrl, altText, onImageChange])

  const handleRemoveImage = () => {
    setPreviewUrl(undefined)
    setUrlInput('')
    setAltText('')
    setCropSourceUrl(undefined)
    setCropSourceDimensions(null)
    setCropDialogOpen(false)
    logger.debug('[ProductImageManager.handleRemoveImage] Calling onImageChange with null to clear fields')
    // Send null (not undefined) to explicitly clear the image fields
    onImageChange(null, null)
    notify.success('Image removed')
  }

  const handleEditImage = () => {
    logger.debug('[ProductImageManager.handleEditImage] Editing image - populating fields with current values')
    // Only prefill with editable URLs; local data/blob previews are not useful to edit.
    setUrlInput(toEditableInputUrl(previewUrl))
    // Clear preview to show input mode
    setPreviewUrl(undefined)
  }

  const handleOpenCropDialog = () => {
    if (!cropSourceUrl) {
      notify.error('Add an image before cropping')
      return
    }

    setCropXPercent(50)
    setCropYPercent(50)
    setCropDialogOpen(true)
  }

  const cropRect = cropSourceDimensions
    ? calculateCropRect(cropSourceDimensions.width, cropSourceDimensions.height, cropXPercent, cropYPercent)
    : null
  const cropPreviewSize = cropSourceDimensions
    ? getCropPreviewSize(cropSourceDimensions.width, cropSourceDimensions.height)
    : null
  const maxCropOffsetX = cropSourceDimensions && cropRect ? cropSourceDimensions.width - cropRect.width : 0
  const maxCropOffsetY = cropSourceDimensions && cropRect ? cropSourceDimensions.height - cropRect.height : 0

  const updateCropFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!cropPreviewRef.current || !cropPreviewSize || !cropSourceDimensions || !cropRect) {
      return
    }

    const bounds = cropPreviewRef.current.getBoundingClientRect()
    const previewCropWidth = cropRect.width * (cropPreviewSize.width / cropSourceDimensions.width)
    const previewCropHeight = cropRect.height * (cropPreviewSize.height / cropSourceDimensions.height)
    const maxPreviewOffsetX = Math.max(0, cropPreviewSize.width - previewCropWidth)
    const maxPreviewOffsetY = Math.max(0, cropPreviewSize.height - previewCropHeight)
    const offsetX = Math.max(0, Math.min(maxPreviewOffsetX, clientX - bounds.left - (previewCropWidth / 2)))
    const offsetY = Math.max(0, Math.min(maxPreviewOffsetY, clientY - bounds.top - (previewCropHeight / 2)))

    setCropXPercent(maxPreviewOffsetX === 0 ? 50 : (offsetX / maxPreviewOffsetX) * 100)
    setCropYPercent(maxPreviewOffsetY === 0 ? 50 : (offsetY / maxPreviewOffsetY) * 100)
  }, [cropPreviewSize, cropSourceDimensions, cropRect])

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropRect) {
      return
    }

    activeCropPointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    updateCropFromPointer(event.clientX, event.clientY)
  }

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeCropPointerIdRef.current !== event.pointerId) {
      return
    }

    updateCropFromPointer(event.clientX, event.clientY)
  }

  const handleCropPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeCropPointerIdRef.current !== event.pointerId) {
      return
    }

    activeCropPointerIdRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleApplyCrop = async () => {
    if (!cropSourceUrl || !cropRect) {
      notify.error('Load an image before applying a crop')
      return
    }

    setIsApplyingCrop(true)
    try {
      const imageFile = await sourceUrlToFile(cropSourceUrl)
      const croppedImageUrl = await APIService.uploadImage(imageFile, cropRect)
      setPreviewUrl(croppedImageUrl)
      setCropSourceUrl(croppedImageUrl)
      setCropSourceDimensions(null)
      logger.debug('[ProductImageManager.handleApplyCrop] Calling onImageChange:', { croppedImageUrl, altText, cropRect })
      onImageChange(croppedImageUrl, altText)
      setCropDialogOpen(false)
      notify.success('Image crop applied')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to crop image')
    } finally {
      setIsApplyingCrop(false)
    }
  }

  const currentImageReference = (previewUrl ?? cropSourceUrl ?? urlInput.trim()) || undefined
  const currentImageId = currentImageReference ? parseImageIdFromUrl(currentImageReference) : undefined

  return (
    <>
      <div className="space-y-4">
        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <button
                type="button"
                className="w-full aspect-video bg-muted rounded-md overflow-hidden border hover:opacity-90 transition-opacity text-left"
                onClick={handleEditImage}
                disabled={disabled}
                aria-label="Edit image URL and alt text"
              >
                <img
                  src={previewUrl}
                  alt={altText || 'Product preview'}
                  className="w-full h-full object-cover"
                />
              </button>
              <div className="absolute top-2 left-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenCropDialog}
                  disabled={disabled}
                  className="!bg-white !text-black hover:!bg-white border border-border shadow-sm"
                >
                  Crop
                </Button>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 !bg-white !text-black hover:!bg-white border border-border shadow-sm"
                disabled={disabled}
              >
                <Trash size={16} className="mr-1" />
                Remove
              </Button>
            </div>

            <div className="space-y-2">
              {currentImageReference && (
                <p className="text-xs text-muted-foreground break-all">
                  {getImageReferenceSummary(currentImageReference, currentImageId)}
                </p>
              )}
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Alt Text (optional)
                <Input
                  id="image-alt-text"
                  name="imageAlt"
                  autoComplete="off"
                  value={altText}
                  onChange={(e) => handleAltTextChange(e.target.value)}
                  onBlur={commitAltTextToParent}
                  placeholder="Describe the image for accessibility"
                  disabled={disabled}
                  aria-invalid={!!imageAltError}
                  aria-describedby={`image-alt-help${imageAltError ? ' image-alt-error' : ''}`}
                  className="mt-1"
                />
              </label>
              <p id="image-alt-help" className="text-xs text-muted-foreground">
                Add alt text when available; if omitted, fallback alt may be used.
              </p>
              {imageAltError && (
                <p id="image-alt-error" className="text-sm text-destructive" role="alert">{imageAltError}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {currentImageReference && (
                <p className="text-xs text-muted-foreground break-all" aria-live="polite">
                  {getImageReferenceSummary(currentImageReference, currentImageId)}
                </p>
              )}
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

            {canUploadFile && (
              <>
                <div className="flex items-center gap-2 my-1">
                  <hr className="flex-1 border-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <hr className="flex-1 border-border" />
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={disabled || isUploadingImage}
                    aria-label="Upload image file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      logger.debug('[ProductImageManager] Upload Image File button clicked')
                      fileInputRef.current?.click()
                    }}
                    disabled={disabled || isUploadingImage}
                    aria-busy={isUploadingImage ? 'true' : 'false'}
                    className="w-full"
                  >
                    {isUploadingImage ? 'Uploading Image…' : 'Upload Image File'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">Upload an image from your device (max 5MB)</p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Alt Text (optional)
                <Input
                  id="image-alt-text"
                  name="imageAlt"
                  autoComplete="off"
                  value={altText}
                  onChange={(e) => handleAltTextChange(e.target.value)}
                  onBlur={commitAltTextToParent}
                  placeholder="Describe the image for accessibility"
                  disabled={disabled}
                  aria-invalid={!!imageAltError}
                  aria-describedby={`image-alt-help${imageAltError ? ' image-alt-error' : ''}`}
                  className="mt-1"
                />
              </label>
              <p id="image-alt-help" className="text-xs text-muted-foreground">
                Add alt text when available; if omitted, fallback alt may be used.
              </p>
              {imageAltError && (
                <p id="image-alt-error" className="text-sm text-destructive" role="alert">{imageAltError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Product Image</DialogTitle>
            <DialogDescription>
              Product cards use a 16:9 crop. Move the crop window to choose what stays visible.
            </DialogDescription>
          </DialogHeader>

          {cropSourceUrl && cropSourceDimensions && cropRect && cropPreviewSize ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div
                    ref={cropPreviewRef}
                  className="relative mx-auto overflow-hidden rounded-md border bg-muted"
                  style={{ width: `${cropPreviewSize.width}px`, height: `${cropPreviewSize.height}px` }}
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerEnd}
                    onPointerCancel={handleCropPointerEnd}
                    onPointerLeave={handleCropPointerEnd}
                >
                  <img
                    src={cropSourceUrl}
                    alt=""
                    aria-hidden="true"
                      className="h-full w-full touch-none select-none"
                      draggable={false}
                  />
                  <div
                      className="pointer-events-none absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                    style={{
                      left: `${(cropRect.x / cropSourceDimensions.width) * 100}%`,
                      top: `${(cropRect.y / cropSourceDimensions.height) * 100}%`,
                      width: `${(cropRect.width / cropSourceDimensions.width) * 100}%`,
                      height: `${(cropRect.height / cropSourceDimensions.height) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Drag the highlighted crop window with the mouse or touch, or use the controls below. The sliders also work with the keyboard. Cropping keeps the current 16:9 product card aspect ratio.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm font-medium">
                    <span>Horizontal position</span>
                    <span className="text-muted-foreground">
                      {maxCropOffsetX > 0 ? `${Math.round((cropRect.x / maxCropOffsetX) * 100)}%` : 'Locked'}
                    </span>
                  </div>
                  <Slider
                    value={[cropXPercent]}
                    onValueChange={(value) => setCropXPercent(value[0] ?? 50)}
                    min={0}
                    max={100}
                    step={1}
                    disabled={maxCropOffsetX === 0 || isApplyingCrop}
                    className="py-2"
                    aria-label="Adjust horizontal crop position"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm font-medium">
                    <span>Vertical position</span>
                    <span className="text-muted-foreground">
                      {maxCropOffsetY > 0 ? `${Math.round((cropRect.y / maxCropOffsetY) * 100)}%` : 'Locked'}
                    </span>
                  </div>
                  <Slider
                    value={[cropYPercent]}
                    onValueChange={(value) => setCropYPercent(value[0] ?? 50)}
                    min={0}
                    max={100}
                    step={1}
                    disabled={maxCropOffsetY === 0 || isApplyingCrop}
                    className="py-2"
                    aria-label="Adjust vertical crop position"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading image…</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCropDialogOpen(false)} disabled={isApplyingCrop}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApplyCrop} disabled={!cropRect || isApplyingCrop}>
              {isApplyingCrop ? 'Applying Crop…' : 'Apply Crop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
