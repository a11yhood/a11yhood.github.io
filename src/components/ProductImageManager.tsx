import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link as LinkIcon, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'

type ProductImageManagerProps = {
  imageUrl?: string
  imageAlt?: string
  onImageChange: (imageUrl: string | undefined, imageAlt: string | undefined) => void
  disabled?: boolean
  imageAltError?: string
}

export function ProductImageManager({
  imageUrl,
  imageAlt,
  onImageChange,
  disabled = false,
  imageAltError,
}: ProductImageManagerProps) {
  const [urlInput, setUrlInput] = useState(imageUrl || '')
  const [altText, setAltText] = useState(imageAlt || '')
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(imageUrl)

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error('Please enter an image URL')
      return
    }

    try {
      new URL(urlInput)
      setPreviewUrl(urlInput)
      onImageChange(urlInput, altText)
      toast.success('Image URL added successfully')
    } catch {
      toast.error('Please enter a valid URL')
    }
  }

  const handleAltTextChange = (value: string) => {
    setAltText(value)
    if (previewUrl) {
      onImageChange(previewUrl, value)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(undefined)
    setUrlInput('')
    setAltText('')
    onImageChange(undefined, undefined)
    toast.success('Image removed')
  }

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="w-full aspect-video max-w-md bg-muted rounded-md overflow-hidden border">
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
              <p id="image-alt-error" className="text-sm text-destructive">{imageAltError}</p>
            )}
          </div>
        </div>
      ) : (
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
            Provide a direct link to an image hosted online.
          </p>
        </div>
      )}
    </div>
  )
}
